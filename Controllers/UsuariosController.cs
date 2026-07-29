using Microsoft.AspNetCore.Mvc;
using TedaInventarioWeb.Models;
using TedaInventarioWeb.ViewModels;

namespace TedaInventarioWeb.Controllers;

public class UsuariosController : Controller
{
    [HttpGet]
    public IActionResult Index()
    {
        var model = new UsuarioViewModel
        {
            PermisosDisponibles =
            [
                new() { Codigo = "verProductos", Nombre = "Ver productos", Modulo = "Productos" },
                new() { Codigo = "buscarProductos", Nombre = "Buscar productos", Modulo = "Productos" },
                new() { Codigo = "buscarCodigoBarras", Nombre = "Buscar por código de barras", Modulo = "Productos" },
                new() { Codigo = "agregarProductos", Nombre = "Agregar productos", Modulo = "Productos" },
                new() { Codigo = "editarProductos", Nombre = "Editar productos", Modulo = "Productos" },
                new() { Codigo = "eliminarProductos", Nombre = "Eliminar productos", Modulo = "Productos" },
                new() { Codigo = "verPrecios", Nombre = "Ver precios", Modulo = "Productos" },
                new() { Codigo = "verPrecioCosto", Nombre = "Ver precio de costo", Modulo = "Productos" },
                new() { Codigo = "importarProductos", Nombre = "Importar productos desde Excel", Modulo = "Productos" },
                new() { Codigo = "verEmpresas", Nombre = "Ver empresas", Modulo = "Empresas" },
                new() { Codigo = "agregarEmpresas", Nombre = "Agregar empresas", Modulo = "Empresas" },
                new() { Codigo = "editarEmpresas", Nombre = "Editar empresas", Modulo = "Empresas" },
                new() { Codigo = "eliminarEmpresas", Nombre = "Eliminar empresas", Modulo = "Empresas" },
                new() { Codigo = "prepararRecuentos", Nombre = "Preparar recuentos", Modulo = "Recuentos" },
                new() { Codigo = "registrarConteos", Nombre = "Registrar conteos", Modulo = "Recuentos" },
                new() { Codigo = "editarConteos", Nombre = "Editar conteos", Modulo = "Recuentos" },
                new() { Codigo = "verResultadosRecuento", Nombre = "Ver resultados del recuento", Modulo = "Recuentos" },
                new() { Codigo = "verCantidadesEsperadas", Nombre = "Ver cantidades esperadas por ubicación", Modulo = "Recuentos" },
                new() { Codigo = "configurarCantidadesEsperadas", Nombre = "Configurar cantidades esperadas", Modulo = "Recuentos" },
                new() { Codigo = "finalizarRecuentos", Nombre = "Finalizar recuentos", Modulo = "Recuentos" },
                new() { Codigo = "verHistorial", Nombre = "Ver historial", Modulo = "Consultas" },
                new() { Codigo = "verControlSemanal", Nombre = "Ver productos y control semanal", Modulo = "Consultas" },
                new() { Codigo = "verMovimientos", Nombre = "Ver tabla de movimientos", Modulo = "Consultas" },
                new() { Codigo = "exportarDatos", Nombre = "Exportar tablas a Excel", Modulo = "Consultas" },
                new() { Codigo = "administrarUsuarios", Nombre = "Administrar usuarios", Modulo = "Seguridad" }
                ,new() { Codigo = "verUsuarios", Nombre = "Ver usuarios", Modulo = "Seguridad" }
                ,new() { Codigo = "crearUsuarios", Nombre = "Crear usuarios", Modulo = "Seguridad" }
                ,new() { Codigo = "editarUsuarios", Nombre = "Editar usuarios", Modulo = "Seguridad" }
                ,new() { Codigo = "editarPermisos", Nombre = "Editar permisos", Modulo = "Seguridad" }
                ,new() { Codigo = "verDatosPreparados", Nombre = "Ver datos preparados por administración", Modulo = "Recuentos" }
                ,new() { Codigo = "verReportes", Nombre = "Ver reportes", Modulo = "Consultas" }
            ]
        };

        return View(model);
    }
}
