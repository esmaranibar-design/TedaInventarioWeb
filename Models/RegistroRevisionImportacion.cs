namespace TedaInventarioWeb.Models;

public class RegistroRevisionImportacion
{
    public string HojaOriginal { get; set; } = string.Empty;
    public string FilaOriginal { get; set; } = string.Empty;
    public string Producto { get; set; } = string.Empty;
    public string Empresa { get; set; } = string.Empty;
    public string Motivo { get; set; } = string.Empty;
    public string DatosEncontrados { get; set; } = string.Empty;
}
