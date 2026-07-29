namespace TedaInventarioWeb.Models;

public class HistorialImportacion
{
    public int Id { get; set; }
    public string NombreArchivo { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; }
    public int UsuarioId { get; set; }
    public string Usuario { get; set; } = string.Empty;
    public int EmpresasCreadas { get; set; }
    public int ProductosCreados { get; set; }
    public int ProductosActualizados { get; set; }
    public int ProductosOmitidos { get; set; }
    public int ProductosConError { get; set; }
}
