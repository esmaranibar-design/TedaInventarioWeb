namespace TedaInventarioWeb.Models;

public class Movimiento
{
    public int Id { get; set; }
    public DateTime FechaHora { get; set; }
    public int UsuarioId { get; set; }
    public string Usuario { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public string TipoAccion { get; set; } = string.Empty;
    public string Modulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string? Producto { get; set; }
    public string? Empresa { get; set; }
    public string? ValorAnterior { get; set; }
    public string? ValorNuevo { get; set; }
}
