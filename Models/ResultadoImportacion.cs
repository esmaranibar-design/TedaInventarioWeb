namespace TedaInventarioWeb.Models;

public class ResultadoImportacion
{
    public string NombreArchivo { get; set; } = string.Empty;
    public DateTime FechaProcesamiento { get; set; } = DateTime.Now;
    public int HojasProcesadas { get; set; }
    public int FilasLeidas { get; set; }
    public int DuplicadosEliminados { get; set; }
    public List<ProductoImportado> Productos { get; set; } = [];
    public List<RegistroRevisionImportacion> Revisar { get; set; } = [];
    public List<string> Errores { get; set; } = [];
    public List<string> NombresHojas { get; set; } = [];
    public string CatalogoBase64 { get; set; } = string.Empty;
}
