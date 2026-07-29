namespace TedaInventarioWeb.Models;

public class ConteoUbicacion
{
    public int Id { get; set; }
    public int DetalleRecuentoId { get; set; }
    public int UbicacionId { get; set; }
    public decimal Cantidad { get; set; }
}
