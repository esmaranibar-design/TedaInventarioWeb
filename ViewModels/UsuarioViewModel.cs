using TedaInventarioWeb.Models;

namespace TedaInventarioWeb.ViewModels;

public class UsuarioViewModel
{
    public string Titulo { get; set; } = "Administrar usuarios";
    public IReadOnlyList<Permiso> PermisosDisponibles { get; set; } = [];
}
