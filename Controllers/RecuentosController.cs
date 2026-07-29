using Microsoft.AspNetCore.Mvc;
using TedaInventarioWeb.ViewModels;
using TedaInventarioWeb.Models;
using ClosedXML.Excel;

namespace TedaInventarioWeb.Controllers;

public class RecuentosController : Controller
{
    [HttpGet]
    public IActionResult Nuevo()
    {
        var viewModel = new NuevoRecuentoViewModel
        {
            FechaHoraServidor = DateTime.Now
        };

        return View(viewModel);
    }

    [HttpPost]
    public IActionResult Exportar([FromBody] List<RecuentoExportacion>? registros)
    {
        if (registros is null || registros.Count == 0)
            return BadRequest(new { mensaje = "No hay datos para exportar" });

        var ubicaciones = registros.SelectMany(x => x.Ubicaciones)
            .Select(x => x.Nombre).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        using var libro = new XLWorkbook();
        var hoja = libro.Worksheets.Add("Recuentos");
        var encabezados = new List<string>
        {
            "Fecha", "Hora", "Empresa", "Código producto", "Código de barras",
            "Producto", "Presentación", "Usuario"
        };
        foreach (var ubicacion in ubicaciones)
        {
            encabezados.Add($"{ubicacion} esperado");
            encabezados.Add($"{ubicacion} encontrado");
        }
        encabezados.AddRange(["Total esperado", "Total encontrado", "Ventas según recuento",
            "Ventas según sistema", "Diferencia", "Estado", "Observaciones"]);

        for (var columna = 0; columna < encabezados.Count; columna++)
            hoja.Cell(1, columna + 1).Value = encabezados[columna];

        for (var indice = 0; indice < registros.Count; indice++)
        {
            var registro = registros[indice];
            var fila = indice + 2;
            var columna = 1;
            hoja.Cell(fila, columna++).Value = registro.FechaHora.Date;
            hoja.Cell(fila, columna++).Value = registro.FechaHora.TimeOfDay;
            hoja.Cell(fila, columna++).Value = registro.Empresa;
            hoja.Cell(fila, columna++).Value = registro.CodigoProducto;
            hoja.Cell(fila, columna++).Value = registro.CodigoBarras;
            hoja.Cell(fila, columna++).Value = registro.Producto;
            hoja.Cell(fila, columna++).Value = registro.Presentacion;
            hoja.Cell(fila, columna++).Value = registro.Usuario;
            foreach (var ubicacion in ubicaciones)
            {
                var detalle = registro.Ubicaciones.FirstOrDefault(x =>
                    string.Equals(x.Nombre, ubicacion, StringComparison.OrdinalIgnoreCase));
                hoja.Cell(fila, columna++).Value = detalle?.Esperado ?? 0;
                hoja.Cell(fila, columna++).Value = detalle?.Encontrado ?? 0;
            }
            hoja.Cell(fila, columna++).Value = registro.TotalEsperado;
            hoja.Cell(fila, columna++).Value = registro.TotalEncontrado;
            hoja.Cell(fila, columna++).Value = registro.VentasSegunRecuento;
            hoja.Cell(fila, columna++).Value = registro.VentasSegunSistema;
            hoja.Cell(fila, columna++).Value = registro.Diferencia;
            hoja.Cell(fila, columna++).Value = registro.Estado;
            hoja.Cell(fila, columna).Value = registro.Observaciones;
        }

        var rango = hoja.Range(1, 1, registros.Count + 1, encabezados.Count);
        rango.SetAutoFilter();
        hoja.SheetView.FreezeRows(1);
        hoja.Row(1).Style.Fill.BackgroundColor = XLColor.FromHtml("#5B2182");
        hoja.Row(1).Style.Font.FontColor = XLColor.White;
        hoja.Row(1).Style.Font.Bold = true;
        hoja.Column(1).Style.DateFormat.Format = "dd/MM/yyyy";
        hoja.Column(2).Style.DateFormat.Format = "HH:mm";
        hoja.Columns(9, encabezados.Count - 3).Style.NumberFormat.Format = "0.00";
        hoja.Columns().AdjustToContents(6, 35);

        using var memoria = new MemoryStream();
        libro.SaveAs(memoria);
        var nombre = $"Recuentos_TeDa_{DateTime.Now:yyyy-MM-dd_HH-mm}.xlsx";
        return File(memoria.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nombre);
    }
}
