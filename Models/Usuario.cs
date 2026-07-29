namespace TedaInventarioWeb.Models;

public class Usuario
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string NombreUsuario { get; set; } = string.Empty;
    public string Clave { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
    public bool EsAdministradoraPrincipal { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.Now;
    public DateTime? UltimoAcceso { get; set; }
    public List<string> Permisos { get; set; } = [];
}
