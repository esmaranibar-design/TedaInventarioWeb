namespace TedaInventarioWeb.Models;

public class ProductoImportado
{
    public string Codigo { get; set; } = string.Empty;
    public string Empresa { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Presentacion { get; set; } = string.Empty;
    public decimal CantidadPorPaquete { get; set; } = 1;
    public decimal PrecioVenta { get; set; }
    public decimal PrecioCosto { get; set; }
    public decimal StockMinimo { get; set; }
    public string Estado { get; set; } = "Activo";
    public string HojaOrigen { get; set; } = string.Empty;
    public int FilaOrigen { get; set; }
    public string ObservacionImportacion { get; set; } = string.Empty;
    public string Resultado { get; set; } = "Nuevo";
}
