namespace TedaInventarioWeb.Models;

public class DetalleRecuento
{
    public int Id { get; set; }
    public int RecuentoId { get; set; }
    public int ProductoId { get; set; }
    public decimal RecuentoManualTotal { get; set; }
    public decimal VentasSegunReconteo { get; set; }
    public decimal Diferencia { get; set; }
    public decimal PedidoSugerido { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; }
}
