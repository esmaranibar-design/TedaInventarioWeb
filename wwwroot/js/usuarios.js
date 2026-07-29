(() => {
    "use strict";

    const store = window.TedaStore;
    const byId = id => document.getElementById(id);
    const currentUser = store.currentUser();
    const escapeHtml = value => String(value ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    const formatDate = value => value
        ? new Intl.DateTimeFormat("es-BO", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
        : "Nunca";
    const nextId = items => items.length ? Math.max(...items.map(item => Number(item.id))) + 1 : 1;

    let adminData = store.getAdminData();

    function canManage() {
        return store.hasPermission("administrarUsuarios", currentUser) ||
            store.hasPermission("editarPermisos", currentUser);
    }

    function showToast(message, type = "success") {
        byId("userToastBody").textContent = message;
        byId("userToast").className = `toast border-0 toast-${type}`;
        bootstrap.Toast.getOrCreateInstance(byId("userToast")).show();
    }

    function renderUsers() {
        if (!canManage()) return;
        const search = byId("userSearch").value.trim().toLowerCase();
        const role = byId("userRoleFilter").value;
        const status = byId("userStatusFilter").value;
        const users = adminData.users.filter(user =>
            (!search || user.name.toLowerCase().includes(search) || user.username.toLowerCase().includes(search)) &&
            (!role || user.role === role) &&
            (!status || (status === "active" ? user.active : !user.active)));

        byId("usersTableBody").innerHTML = users.map(user => `
            <tr>
                <td>${escapeHtml(user.name)}${user.mainAdmin ? '<span class="badge text-bg-warning ms-2">Principal</span>' : ""}</td>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.role)}</td>
                <td><span class="badge ${user.active ? "text-bg-success" : "text-bg-secondary"}">${user.active ? "Activo" : "Inactivo"}</span></td>
                <td>${escapeHtml(formatDate(user.createdAt))}</td>
                <td>${escapeHtml(formatDate(user.lastAccess))}</td>
                <td>${user.permissions.length} permisos</td>
                <td>
                    <div class="d-flex flex-wrap justify-content-center gap-1">
                        <button class="btn btn-sm btn-outline-primary js-edit-user" data-user-id="${user.id}" type="button">Editar usuario</button>
                        <button class="btn btn-sm ${user.active ? "btn-outline-warning" : "btn-outline-success"} js-toggle-user"
                                data-user-id="${user.id}" type="button" ${user.mainAdmin ? "disabled" : ""}>
                            ${user.active ? "Desactivar" : "Activar"}
                        </button>
                        <button class="btn btn-sm btn-outline-danger js-delete-user" data-user-id="${user.id}"
                                type="button" ${user.mainAdmin ? "disabled" : ""}>Eliminar</button>
                    </div>
                </td>
            </tr>`).join("");

        byId("emptyUsersMessage").classList.toggle("d-none", users.length > 0);
        document.querySelectorAll(".js-edit-user").forEach(button =>
            button.addEventListener("click", () => openUserModal(Number(button.dataset.userId))));
        document.querySelectorAll(".js-toggle-user").forEach(button =>
            button.addEventListener("click", () => toggleUser(Number(button.dataset.userId))));
        document.querySelectorAll(".js-delete-user").forEach(button =>
            button.addEventListener("click", () => deleteUser(Number(button.dataset.userId))));
    }

    function openUserModal(userId = null) {
        if (!canManage()) return;
        if (!userId && !store.hasPermission("crearUsuarios", currentUser) &&
            !store.hasPermission("administrarUsuarios", currentUser)) return;
        const user = adminData.users.find(item => item.id === userId);
        byId("userForm").reset();
        byId("userForm").classList.remove("was-validated");
        byId("userFormError").classList.add("d-none");
        byId("userId").value = user?.id ?? "";
        byId("userModalTitle").textContent = user ? "Editar usuario" : "Agregar usuario";
        byId("userSaveButton").textContent = user
            ? (user.mainAdmin ? "Guardar contraseña" : "Guardar cambios")
            : "Crear usuario";
        byId("fullName").value = user?.name ?? "";
        byId("username").value = user?.username ?? "";
        byId("userPassword").required = !user;
        byId("userPassword").type = "password";
        byId("togglePasswordVisibility").textContent = "Mostrar";
        byId("userPasswordHelp").textContent = user
            ? "Déjala vacía para conservar la contraseña actual. Escribe una nueva para cambiarla."
            : "Mínimo 6 caracteres.";
        byId("userRole").value = user?.role ?? "Operaria";
        byId("userActive").checked = user?.active ?? true;

        const selected = user?.permissions ?? store.operatorPermissions;
        document.querySelectorAll(".permission-checkbox").forEach(checkbox => {
            checkbox.checked = selected.includes(checkbox.value);
            checkbox.disabled = Boolean(user?.mainAdmin);
        });
        byId("userRole").disabled = Boolean(user?.mainAdmin);
        byId("userActive").disabled = Boolean(user?.mainAdmin);
        byId("selectAllPermissions").disabled = Boolean(user?.mainAdmin);
        byId("clearAllPermissions").disabled = Boolean(user?.mainAdmin);
        bootstrap.Modal.getOrCreateInstance(byId("userModal")).show();
    }

    function saveUser(event) {
        event.preventDefault();
        if (!canManage()) return;
        const form = event.currentTarget;
        form.classList.add("was-validated");
        const id = Number(byId("userId").value);
        const existing = adminData.users.find(user => user.id === id);
        if (existing && !store.hasPermission("editarPermisos", currentUser) &&
            !store.hasPermission("administrarUsuarios", currentUser)) return;
        if (!existing && !store.hasPermission("crearUsuarios", currentUser) &&
            !store.hasPermission("administrarUsuarios", currentUser)) return;
        const username = byId("username").value.trim();
        const password = byId("userPassword").value;
        const duplicate = adminData.users.some(user =>
            user.id !== id && user.username.toLowerCase() === username.toLowerCase());

        let error = "";
        if (!form.checkValidity()) error = "Completa correctamente los campos obligatorios.";
        else if (duplicate) error = "Ese nombre de usuario ya está registrado.";
        else if (!existing && password.length < 6) error = "La contraseña debe tener al menos 6 caracteres.";
        else if (password && password.length < 6) error = "La contraseña debe tener al menos 6 caracteres.";

        byId("userFormError").textContent = error;
        byId("userFormError").classList.toggle("d-none", !error);
        if (error) return;

        const permissions = [...document.querySelectorAll(".permission-checkbox:checked")]
            .map(checkbox => checkbox.value);
        const user = {
            id: existing?.id ?? nextId(adminData.users),
            name: byId("fullName").value.trim(),
            username,
            password: password ? store.hashPassword(password) : existing.password,
            role: existing?.mainAdmin ? "Administradora" : byId("userRole").value,
            active: existing?.mainAdmin ? true : byId("userActive").checked,
            mainAdmin: existing?.mainAdmin ?? false,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            lastAccess: existing?.lastAccess ?? null,
            permissions: existing?.mainAdmin ? [...store.permissions] : permissions
        };

        const oldValue = existing ? `${existing.name} | ${existing.role} | ${existing.active ? "Activo" : "Inactivo"}` : "";
        const index = adminData.users.findIndex(item => item.id === user.id);
        if (index >= 0) adminData.users[index] = user;
        else adminData.users.push(user);
        store.saveAdminData(adminData);
        store.addMovement({
            actionType: existing ? "Edición" : "Creación",
            module: "Usuarios",
            description: `${existing ? "Se editó" : "Se creó"} el usuario ${user.username}.`,
            previousValue: oldValue,
            newValue: `${user.name} | ${user.role} | ${user.active ? "Activo" : "Inactivo"}`
        });
        bootstrap.Modal.getInstance(byId("userModal")).hide();
        renderUsers();
        showToast(existing
            ? (password && existing.mainAdmin
                ? "Contraseña de la administradora actualizada correctamente."
                : "Usuario actualizado correctamente.")
            : "Usuario creado correctamente.");
    }

    function toggleUser(id) {
        if (!canManage()) return;
        const user = adminData.users.find(item => item.id === id);
        if (!user || user.mainAdmin) return;
        if (user.active && !window.confirm(`¿Desactivar al usuario "${user.name}"?`)) return;
        const previous = user.active ? "Activo" : "Inactivo";
        user.active = !user.active;
        store.saveAdminData(adminData);
        store.addMovement({
            actionType: user.active ? "Activación" : "Desactivación",
            module: "Usuarios",
            description: `Se ${user.active ? "activó" : "desactivó"} el usuario ${user.username}.`,
            previousValue: previous,
            newValue: user.active ? "Activo" : "Inactivo"
        });
        renderUsers();
    }

    function deleteUser(id) {
        if (!canManage()) return;
        const user = adminData.users.find(item => item.id === id);
        if (!user || user.mainAdmin) return;
        if (!window.confirm(`¿Eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`)) return;
        adminData.users = adminData.users.filter(item => item.id !== id);
        store.saveAdminData(adminData);
        store.addMovement({
            actionType: "Eliminación",
            module: "Usuarios",
            description: `Se eliminó el usuario ${user.username}.`,
            previousValue: `${user.name} | ${user.role}`,
            newValue: "Eliminado"
        });
        renderUsers();
        showToast("Usuario eliminado.", "info");
    }

    if (!canManage()) {
        byId("usersAccessDenied").classList.remove("d-none");
    } else {
        byId("usersContent").classList.remove("d-none");
        byId("newUserButton").classList.toggle("d-none",
            !store.hasPermission("crearUsuarios", currentUser) &&
            !store.hasPermission("administrarUsuarios", currentUser));
        byId("newUserButton").addEventListener("click", () => openUserModal());
        byId("userForm").addEventListener("submit", saveUser);
        byId("togglePasswordVisibility").addEventListener("click", () => {
            const input = byId("userPassword");
            const visible = input.type === "text";
            input.type = visible ? "password" : "text";
            byId("togglePasswordVisibility").textContent = visible ? "Mostrar" : "Ocultar";
        });
        byId("selectAllPermissions").addEventListener("click", () =>
            document.querySelectorAll(".permission-checkbox:not(:disabled)")
                .forEach(checkbox => checkbox.checked = true));
        byId("clearAllPermissions").addEventListener("click", () =>
            document.querySelectorAll(".permission-checkbox:not(:disabled)")
                .forEach(checkbox => checkbox.checked = false));
        ["userSearch", "userRoleFilter", "userStatusFilter"].forEach(id =>
            byId(id).addEventListener(id === "userSearch" ? "input" : "change", renderUsers));
        renderUsers();
    }
})();
