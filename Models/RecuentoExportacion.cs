namespace TedaInventarioWeb.Models;

public class RecuentoExportacion
{
    public DateTime FechaHora { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string CodigoProducto { get; set; } = string.Empty;
    public string CodigoBarras { get; set; } = string.Empty;
    public string Producto { get; set; } = string.Empty;
    public string Presentacion { get; set; } = string.Empty;
    public string Usuario { get; set; } = string.Empty;
    public List<UbicacionExportacion> Ubicaciones { get; set; } = [];
    public decimal TotalEsperado { get; set; }
    public decimal TotalEncontrado { get; set; }
    public decimal VentasSegunRecuento { get; set; }
    public decimal VentasSegunSistema { get; set; }
    public decimal Diferencia { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;
}

public class UbicacionExportacion
{
    public string Nombre { get; set; } = string.Empty;
    public decimal Esperado { get; set; }
    public decimal Encontrado { get; set; }
}
