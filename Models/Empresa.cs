namespace TedaInventarioWeb.Models;

public class Empresa
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activa { get; set; } = true;
}
