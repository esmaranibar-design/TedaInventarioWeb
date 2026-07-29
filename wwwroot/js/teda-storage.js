window.TedaStore = (() => {
    "use strict";

    const keys = {
        admin: "tedaInventario.admin.v1",
        counts: "tedaInventario.recuentos.v1",
        movements: "tedaInventario.movimientos.v1",
        filters: "tedaInventario.filtros.v1",
        session: "tedaInventario.session.v1"
    };

    const permissions = [
        "verProductos", "buscarProductos", "buscarCodigoBarras", "agregarProductos", "editarProductos", "eliminarProductos", "importarProductos",
        "verPrecios", "verPrecioCosto",
        "verEmpresas", "agregarEmpresas", "editarEmpresas", "eliminarEmpresas",
        "prepararRecuentos", "registrarConteos", "editarConteos", "finalizarRecuentos",
        "verResultadosRecuento", "verCantidadesEsperadas", "configurarCantidadesEsperadas",
        "verHistorial", "verControlSemanal", "verMovimientos", "exportarDatos", "administrarUsuarios",
        "verUsuarios", "crearUsuarios", "editarUsuarios", "editarPermisos", "verDatosPreparados", "verReportes"
    ];

    const operatorPermissions = [
        "verProductos", "buscarProductos", "buscarCodigoBarras", "verEmpresas",
        "registrarConteos", "finalizarRecuentos", "verResultadosRecuento"
    ];

    const parse = (key, fallback) => {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : structuredClone(fallback);
        } catch {
            return structuredClone(fallback);
        }
    };

    const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const nextId = items => items.length ? Math.max(...items.map(item => Number(item.id))) + 1 : 1;
    const hashPassword = value => {
        let hash = 2166136261;
        for (const character of String(value ?? "")) {
            hash ^= character.charCodeAt(0);
            hash = Math.imul(hash, 16777619);
        }
        return `$teda$${(hash >>> 0).toString(16).padStart(8, "0")}`;
    };

    function migrate() {
        const admin = parse(keys.admin, { users: [], companies: [], locations: [], products: [] });
        admin.roles ??= ["Administradora", "Operaria"];
        admin.expectedConfigurations ??= [];
        const now = new Date().toISOString();

        admin.users = (admin.users ?? []).map((user, index) => ({
            ...user,
            name: user.name ?? user.nombre ?? "",
            username: user.username ?? user.nombreUsuario ?? "",
            password: String(user.password ?? user.clave ?? "").startsWith("$teda$")
                ? String(user.password ?? user.clave)
                : hashPassword(user.password ?? user.clave ?? ""),
            role: user.role ?? user.rol ?? "Operaria",
            active: user.active ?? user.activo ?? true,
            mainAdmin: user.mainAdmin ?? user.esAdministradoraPrincipal ?? index === 0,
            createdAt: user.createdAt ?? user.fechaCreacion ?? now,
            lastAccess: user.lastAccess ?? user.ultimoAcceso ?? null,
            permissions: user.mainAdmin || user.esAdministradoraPrincipal || index === 0
                ? [...permissions]
                : (user.permissions ?? user.permisos ?? [...operatorPermissions])
        }));

        if (!admin.users.length) {
            admin.users = [
                {
                    id: 1, name: "Ana Administradora", username: "admin", password: hashPassword("Admin123*"),
                    role: "Administradora", active: true, mainAdmin: true, createdAt: now,
                    lastAccess: null, permissions: [...permissions]
                },
                {
                    id: 2, name: "María Operaria", username: "operaria", password: hashPassword("Opera123*"),
                    role: "Operaria", active: true, mainAdmin: false, createdAt: now,
                    lastAccess: null, permissions: [...operatorPermissions]
                }
            ];
        }

        const usedProductIds = new Set();
        let nextProductId = 1;
        admin.products = (admin.products ?? []).map(product => {
            let id = Number(product.id ?? product.Id);
            if (!Number.isInteger(id) || id <= 0 || usedProductIds.has(id)) {
                while (usedProductIds.has(nextProductId)) nextProductId++;
                id = nextProductId++;
            }
            usedProductIds.add(id);
            return {
                ...product,
                id,
                companyId: Number(product.companyId ?? product.empresaId ?? product.EmpresaId),
                code: product.code ?? product.codigo ?? product.Codigo ?? `TEDA-${String(id).padStart(6, "0")}`,
                barcode: String(product.barcode ?? product.codigoBarras ?? product.CodigoBarras ?? "").trim(),
                name: product.name ?? product.nombre ?? product.Nombre ?? "",
                presentation: product.presentation ?? product.presentacion ?? product.Presentacion ?? "",
                active: product.active ?? product.activo ?? product.Activo ?? true
            };
        });

        const principal = admin.users.find(user => user.mainAdmin) ?? admin.users[0];
        principal.mainAdmin = true;
        principal.active = true;
        principal.role = "Administradora";
        principal.permissions = [...permissions];
        save(keys.admin, admin);

        if (!localStorage.getItem(keys.movements)) save(keys.movements, []);
        if (!localStorage.getItem(keys.filters)) save(keys.filters, {});
        return admin;
    }

    function getAdminData() {
        return migrate();
    }

    function saveAdminData(data) {
        save(keys.admin, data);
    }

    function getMovements() {
        return parse(keys.movements, []);
    }

    function currentUser() {
        try {
            const session = JSON.parse(sessionStorage.getItem(keys.session));
            return getAdminData().users.find(user => user.id === session?.userId && user.active) ?? null;
        } catch {
            return null;
        }
    }

    function hasPermission(code, user = currentUser()) {
        if (!user?.active) return false;
        if (user.mainAdmin) return true;
        return Array.isArray(user.permissions) && user.permissions.includes(code);
    }

    function addMovement(data) {
        const user = data.user ?? currentUser();
        if (!user) return;
        const movements = getMovements();
        movements.push({
            id: nextId(movements),
            dateTime: new Date().toISOString(),
            userId: user.id,
            userName: user.name,
            role: user.role,
            actionType: data.actionType ?? "Acción",
            module: data.module ?? "Sistema",
            description: data.description ?? "",
            product: data.product ?? "",
            company: data.company ?? "",
            previousValue: data.previousValue ?? "",
            newValue: data.newValue ?? ""
        });
        save(keys.movements, movements);
    }

    function getFilters() {
        return parse(keys.filters, {});
    }

    function saveFilters(filters) {
        save(keys.filters, filters);
    }

    migrate();

    return {
        keys,
        permissions,
        operatorPermissions,
        getAdminData,
        saveAdminData,
        getMovements,
        currentUser,
        hasPermission,
        addMovement,
        getFilters,
        saveFilters,
        hashPassword
    };
})();
