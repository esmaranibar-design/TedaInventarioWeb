namespace TedaInventarioWeb.Models;

public class Ubicacion
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
    public bool Activa { get; set; } = true;
}
