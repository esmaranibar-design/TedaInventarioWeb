using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using TedaInventarioWeb.Models;

namespace TedaInventarioWeb.Services;

public partial class ExcelImportService : IExcelImportService
{
    private static readonly string[] ProductoAliases = ["producto", "nombre", "descripcion", "articulo"];
    private static readonly string[] EmpresaAliases = ["empresa", "proveedor", "distribuidora", "marca"];
    private static readonly string[] PresentacionAliases = ["presentacion", "medida", "contenido", "tamano"];

    public ResultadoImportacion Analizar(Stream archivo, string nombreArchivo)
    {
        using var workbook = new XLWorkbook(archivo);
        var resultado = new ResultadoImportacion { NombreArchivo = nombreArchivo };
        var candidatos = new List<ProductoImportado>();

        foreach (var hoja in workbook.Worksheets)
        {
            resultado.NombresHojas.Add(hoja.Name);
            resultado.HojasProcesadas++;
            var filas = hoja.RowsUsed().ToList();
            resultado.FilasLeidas += filas.Count;
            if (filas.Count == 0) continue;

            var encabezado = EncontrarEncabezado(filas);
            if (encabezado is null)
            {
                resultado.Revisar.Add(new() { HojaOriginal = hoja.Name, Motivo = "No se encontraron encabezados de productos." });
                continue;
            }

            var mapa = CrearMapa(encabezado);
            var columnaProducto = BuscarColumna(mapa, ProductoAliases);
            if (columnaProducto == 0)
            {
                resultado.Revisar.Add(new() { HojaOriginal = hoja.Name, FilaOriginal = encabezado.RowNumber().ToString(), Motivo = "Falta la columna Producto." });
                continue;
            }

            foreach (var fila in filas.Where(f => f.RowNumber() > encabezado.RowNumber()))
            {
                var nombre = Texto(fila, columnaProducto);
                if (string.IsNullOrWhiteSpace(nombre) || nombre.Contains("#REF!", StringComparison.OrdinalIgnoreCase)) continue;

                var empresa = Texto(fila, BuscarColumna(mapa, EmpresaAliases));
                if (string.IsNullOrWhiteSpace(empresa)) empresa = LimpiarEmpresa(hoja.Name);
                var presentacion = Texto(fila, BuscarColumna(mapa, PresentacionAliases));
                if (string.IsNullOrWhiteSpace(presentacion)) presentacion = InferirPresentacion(nombre);

                var producto = new ProductoImportado
                {
                    Codigo = Texto(fila, BuscarColumna(mapa, ["codigo", "cod", "sku"])),
                    Empresa = empresa,
                    Nombre = nombre.Trim(),
                    Presentacion = presentacion,
                    CantidadPorPaquete = Numero(fila, BuscarColumna(mapa, ["cantidad por paquete", "cant paquete", "unidades paquete", "paquete"]), 1),
                    PrecioVenta = Numero(fila, BuscarColumna(mapa, ["precio venta", "precio", "venta"])),
                    PrecioCosto = Numero(fila, BuscarColumna(mapa, ["precio costo", "costo"])),
                    StockMinimo = Numero(fila, BuscarColumna(mapa, ["stock minimo", "minimo"])),
                    Estado = Texto(fila, BuscarColumna(mapa, ["estado"])) is var estado && !string.IsNullOrWhiteSpace(estado) ? estado : "Activo",
                    HojaOrigen = hoja.Name,
                    FilaOrigen = fila.RowNumber()
                };
                if (string.IsNullOrWhiteSpace(producto.Codigo)) producto.Codigo = CrearCodigo(producto);
                if (string.IsNullOrWhiteSpace(producto.Empresa) || string.IsNullOrWhiteSpace(producto.Presentacion))
                {
                    producto.ObservacionImportacion = "Faltan datos que deben revisarse.";
                    resultado.Revisar.Add(new()
                    {
                        HojaOriginal = hoja.Name, FilaOriginal = fila.RowNumber().ToString(),
                        Producto = producto.Nombre, Empresa = producto.Empresa,
                        Motivo = "Empresa o presentación incompleta.",
                        DatosEncontrados = $"{producto.Empresa} | {producto.Presentacion}"
                    });
                }
                candidatos.Add(producto);
            }
        }

        var vistos = new HashSet<string>();
        foreach (var producto in candidatos)
        {
            var clave = Normalizar($"{producto.Empresa}|{producto.Nombre}|{producto.Presentacion}");
            if (!vistos.Add(clave))
            {
                resultado.DuplicadosEliminados++;
                continue;
            }
            resultado.Productos.Add(producto);
        }

        resultado.CatalogoBase64 = Convert.ToBase64String(CrearCatalogo(resultado));
        return resultado;
    }

    private static IXLRow? EncontrarEncabezado(IEnumerable<IXLRow> filas) =>
        filas.Take(40).OrderByDescending(f => CrearMapa(f).Keys.Count(k => ProductoAliases.Contains(k) || EmpresaAliases.Contains(k))).FirstOrDefault();

    private static Dictionary<string, int> CrearMapa(IXLRow fila) =>
        fila.CellsUsed().Select(c => new { Nombre = Normalizar(c.GetFormattedString()), Columna = c.Address.ColumnNumber })
            .Where(x => !string.IsNullOrWhiteSpace(x.Nombre))
            .GroupBy(x => x.Nombre).ToDictionary(g => g.Key, g => g.First().Columna);

    private static int BuscarColumna(Dictionary<string, int> mapa, IEnumerable<string> aliases)
    {
        foreach (var alias in aliases.Select(Normalizar))
        {
            var exacto = mapa.FirstOrDefault(x => x.Key == alias);
            if (exacto.Value != 0) return exacto.Value;
            var parcial = mapa.FirstOrDefault(x => x.Key.Contains(alias));
            if (parcial.Value != 0) return parcial.Value;
        }
        return 0;
    }

    private static string Texto(IXLRow fila, int columna) =>
        columna <= 0 ? string.Empty : RegexEspacios().Replace(fila.Cell(columna).GetFormattedString().Trim(), " ");

    private static decimal Numero(IXLRow fila, int columna, decimal valorPredeterminado = 0)
    {
        if (columna <= 0) return valorPredeterminado;
        var celda = fila.Cell(columna);
        if (celda.TryGetValue<decimal>(out var numero)) return Math.Max(0, numero);
        var limpio = celda.GetFormattedString().Replace("Bs.", "", StringComparison.OrdinalIgnoreCase).Trim();
        return decimal.TryParse(limpio, NumberStyles.Any, CultureInfo.GetCultureInfo("es-BO"), out numero)
            ? Math.Max(0, numero) : valorPredeterminado;
    }

    private static string InferirPresentacion(string nombre) =>
        RegexPresentacion().Match(nombre) is { Success: true } coincidencia ? coincidencia.Value : string.Empty;

    private static string LimpiarEmpresa(string hoja) => RegexAnio().Replace(hoja, "").Trim(' ', '-', '_');
    private static string CrearCodigo(ProductoImportado p) => $"TEDA-{Math.Abs(Normalizar($"{p.Empresa}|{p.Nombre}|{p.Presentacion}").GetHashCode()):D8}";
    private static string Normalizar(string valor)
    {
        var descompuesto = valor.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        return RegexEspacios().Replace(new string(descompuesto.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray()), " ");
    }

    private static byte[] CrearCatalogo(ResultadoImportacion resultado)
    {
        using var libro = new XLWorkbook();
        var productos = libro.Worksheets.Add("Productos");
        string[] encabezados = ["Código", "Empresa", "Producto", "Presentación", "Cantidad por paquete", "Precio venta", "Precio costo", "Stock mínimo", "Estado", "Hoja origen"];
        for (var c = 0; c < encabezados.Length; c++) productos.Cell(1, c + 1).Value = encabezados[c];
        for (var i = 0; i < resultado.Productos.Count; i++)
        {
            var p = resultado.Productos[i]; var r = i + 2;
            productos.Cell(r, 1).Value = p.Codigo; productos.Cell(r, 2).Value = p.Empresa;
            productos.Cell(r, 3).Value = p.Nombre; productos.Cell(r, 4).Value = p.Presentacion;
            productos.Cell(r, 5).Value = p.CantidadPorPaquete; productos.Cell(r, 6).Value = p.PrecioVenta;
            productos.Cell(r, 7).Value = p.PrecioCosto; productos.Cell(r, 8).Value = p.StockMinimo;
            productos.Cell(r, 9).Value = p.Estado; productos.Cell(r, 10).Value = p.HojaOrigen;
        }
        Estilizar(productos, Math.Max(1, resultado.Productos.Count + 1), encabezados.Length);

        var empresas = libro.Worksheets.Add("Empresas");
        empresas.Cell(1, 1).Value = "Empresa";
        var nombres = resultado.Productos.Select(p => p.Empresa).Where(e => !string.IsNullOrWhiteSpace(e)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(e => e).ToList();
        for (var i = 0; i < nombres.Count; i++) empresas.Cell(i + 2, 1).Value = nombres[i];
        Estilizar(empresas, Math.Max(1, nombres.Count + 1), 1);

        var revisar = libro.Worksheets.Add("Revisar");
        string[] er = ["Hoja", "Fila", "Producto", "Empresa", "Motivo", "Datos encontrados"];
        for (var c = 0; c < er.Length; c++) revisar.Cell(1, c + 1).Value = er[c];
        for (var i = 0; i < resultado.Revisar.Count; i++)
        {
            var x = resultado.Revisar[i]; var r = i + 2;
            revisar.Cell(r, 1).Value = x.HojaOriginal; revisar.Cell(r, 2).Value = x.FilaOriginal;
            revisar.Cell(r, 3).Value = x.Producto; revisar.Cell(r, 4).Value = x.Empresa;
            revisar.Cell(r, 5).Value = x.Motivo; revisar.Cell(r, 6).Value = x.DatosEncontrados;
        }
        Estilizar(revisar, Math.Max(1, resultado.Revisar.Count + 1), er.Length);

        var resumen = libro.Worksheets.Add("Resumen");
        resumen.Cell("A1").Value = "Resumen de limpieza TeDá Inventario";
        resumen.Cell("A3").Value = "Archivo"; resumen.Cell("B3").Value = resultado.NombreArchivo;
        resumen.Cell("A4").Value = "Hojas procesadas"; resumen.Cell("B4").Value = resultado.HojasProcesadas;
        resumen.Cell("A5").Value = "Filas leídas"; resumen.Cell("B5").Value = resultado.FilasLeidas;
        resumen.Cell("A6").Value = "Productos únicos"; resumen.Cell("B6").Value = resultado.Productos.Count;
        resumen.Cell("A7").Value = "Duplicados eliminados"; resumen.Cell("B7").Value = resultado.DuplicadosEliminados;
        resumen.Cell("A9").Value = "Hojas encontradas";
        for (var i = 0; i < resultado.NombresHojas.Count; i++) resumen.Cell(i + 10, 1).Value = resultado.NombresHojas[i];
        resumen.Range("A1:B1").Merge().Style.Fill.BackgroundColor = XLColor.FromHtml("#5B21B6");
        resumen.Range("A1:B1").Style.Font.FontColor = XLColor.White;
        resumen.Columns().AdjustToContents(10, 45);

        using var memoria = new MemoryStream();
        libro.SaveAs(memoria);
        return memoria.ToArray();
    }

    private static void Estilizar(IXLWorksheet hoja, int ultimaFila, int ultimaColumna)
    {
        var encabezado = hoja.Range(1, 1, 1, ultimaColumna);
        encabezado.Style.Fill.BackgroundColor = XLColor.FromHtml("#5B21B6");
        encabezado.Style.Font.FontColor = XLColor.White;
        encabezado.Style.Font.Bold = true;
        hoja.SheetView.FreezeRows(1);
        hoja.Range(1, 1, ultimaFila, ultimaColumna).SetAutoFilter();
        hoja.Columns(1, ultimaColumna).AdjustToContents(5, 40);
        hoja.Range(1, 1, ultimaFila, ultimaColumna).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        hoja.Range(1, 1, ultimaFila, ultimaColumna).Style.Border.InsideBorderColor = XLColor.FromHtml("#E8DDF5");
    }

    [GeneratedRegex(@"\s+")] private static partial Regex RegexEspacios();
    [GeneratedRegex(@"(?i)\b\d+(?:[.,]\d+)?\s*(?:ml|l|kg|g|gr|unidad(?:es)?|u)\b")] private static partial Regex RegexPresentacion();
    [GeneratedRegex(@"\b20\d{2}\b")] private static partial Regex RegexAnio();
}
