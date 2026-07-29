namespace TedaInventarioWeb.Models;

public class DetalleRecuentoUbicacion
{
    public int Id { get; set; }
    public int DetalleRecuentoId { get; set; }
    public int UbicacionId { get; set; }
    public decimal CantidadEsperada { get; set; }
    public decimal CantidadEncontrada { get; set; }
    public decimal Diferencia => CantidadEncontrada - CantidadEsperada;
}
