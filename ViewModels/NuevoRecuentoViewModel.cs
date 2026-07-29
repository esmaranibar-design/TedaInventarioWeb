namespace TedaInventarioWeb.ViewModels;

public class NuevoRecuentoViewModel
{
    public DateTime FechaHoraServidor { get; set; } = DateTime.Now;
    public string Titulo { get; set; } = "Nuevo recuento de inventario";
}
