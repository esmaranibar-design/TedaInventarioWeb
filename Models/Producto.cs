namespace TedaInventarioWeb.Models;

public class Producto
{
    public int Id { get; set; }
    public string CodigoInterno { get; set; } = string.Empty;
    public string CodigoBarras { get; set; } = string.Empty;
    public int EmpresaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Presentacion { get; set; } = string.Empty;
    public decimal CantidadPorPaquete { get; set; }
    public decimal PrecioVenta { get; set; }
    public decimal PrecioCosto { get; set; }
    public decimal SaldoAnterior { get; set; }
    public decimal Compras { get; set; }
    public decimal VentasSistema { get; set; }
    public decimal PromedioVentasSemanal { get; set; }
    public decimal StockMinimo { get; set; }
    public bool Activo { get; set; } = true;
}
