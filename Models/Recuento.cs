namespace TedaInventarioWeb.Models;

public class Recuento
{
    public int Id { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaFinalizacion { get; set; }
    public int UsuarioOperariaId { get; set; }
    public string Estado { get; set; } = "Abierto";
}
