namespace TedaInventarioWeb.Models;

public class ConfiguracionUbicacion
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public int UbicacionId { get; set; }
    public decimal CantidadEsperada { get; set; }
}
