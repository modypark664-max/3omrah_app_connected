const normalizePermissions = (user) => {
    if (!user) return [];
    if (Array.isArray(user.permissions)) {
        return user.permissions;
    }
    if (typeof user.permissions === 'string') {
        return [user.permissions];
    }
    return [];
};

const getNormalizedRole = (user) => {
    if (!user || typeof user.role !== 'string') return '';
    return user.role.toLowerCase();
};

const isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        if (req.accepts('html')) {
            req.flash && req.flash('error', 'يجب تسجيل الدخول للوصول إلى لوحة التحكم');
            return res.redirect('/login');
        }
        return res.status(401).json({ error: 'Authentication required' });
    }

    const normalizedRole = getNormalizedRole(req.user);
    if (req.user && normalizedRole) {
        req.user.role = normalizedRole;
    }

    if (!req.user) {
        if (typeof res.render === 'function') {
            return res.status(403).render('error', {
                title: 'وصول مرفوض',
                message: 'ليست لديك صلاحية للوصول إلى لوحة التحكم',
                errorCode: 403,
                user: req.user
            });
        }
        return res.status(403).send('Forbidden');
    }

    const permissions = normalizePermissions(req.user);
    const isAdminRole = normalizedRole === 'admin';
    const hasAssignedPermissions = permissions.length > 0;
    const hasExplicitFullAccess = permissions.includes('full_admin_access');
    const hasFullAdminAccess = (isAdminRole && permissions.length === 0) || hasExplicitFullAccess;
    const hasAnyAdminPermission = isAdminRole || hasAssignedPermissions || hasExplicitFullAccess;

    // Persist normalized data for downstream handlers/views
    req.user.permissions = permissions;
    req.user.hasFullAdminAccess = hasFullAdminAccess;
    req.user.hasAnyAdminPermission = hasAnyAdminPermission;

    if (!hasAnyAdminPermission) {
        if (typeof res.render === 'function') {
            return res.status(403).render('error', {
                title: 'الصلاحيات مطلوبة',
                message: 'لم يتم تعيين أي صلاحيات إدارية بعد. يرجى التواصل مع المسؤول الرئيسي.',
                errorCode: 403,
                user: req.user
            });
        }
        return res.status(403).send('Admin permissions missing');
    }

    return next();
};

const hasAdminPortalAccess = (req, res, next) => {
    if (!req.isAuthenticated()) {
        if (req.accepts('html')) {
            req.flash && req.flash('error', 'يجب تسجيل الدخول للوصول إلى لوحة التحكم');
            return res.redirect('/login');
        }
        return res.status(401).json({ error: 'Authentication required' });
    }

    const normalizedRole = getNormalizedRole(req.user);
    if (req.user && normalizedRole) {
        req.user.role = normalizedRole;
    }

    const permissions = normalizePermissions(req.user);
    const hasFullAdminAccess = normalizedRole === 'admin' && (permissions.length === 0 || permissions.includes('full_admin_access'));
    const hasDelegatedPermissions = permissions.length > 0;

    req.user.permissions = permissions;
    req.user.hasFullAdminAccess = hasFullAdminAccess;
    req.user.hasAnyAdminPermission = hasFullAdminAccess || hasDelegatedPermissions;

    if (!req.user.hasAnyAdminPermission) {
        if (typeof res.render === 'function') {
            return res.status(403).render('error', {
                title: 'وصول مرفوض',
                message: 'ليست لديك صلاحية للوصول إلى لوحة التحكم',
                errorCode: 403,
                user: req.user
            });
        }
        return res.status(403).send('Forbidden');
    }

    return next();
};

// Enhanced permission checking middleware
const hasPermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const user = req.user;
        const userRole = getNormalizedRole(user);
        if (user && userRole) {
            user.role = userRole;
        }

        // Full admin access overrides all permission checks
        if (userRole === 'admin' && user.permissions && user.permissions.includes('full_admin_access')) {
            return next();
        }

        // Legacy admin role check (for backward compatibility)
        if (userRole === 'admin') {
            return next();
        }

        // Check specific permission
        if (user.permissions && user.permissions.includes(requiredPermission)) {
            return next();
        }

        return res.status(403).json({ 
            error: "Insufficient permissions",
            required: requiredPermission,
            userPermissions: user.permissions || []
        });
    };
};

// Convenience functions for common permission checks
const canManageCards = hasPermission('add_card');
const canEditCards = hasPermission('edit_card');
const canDeleteCards = hasPermission('delete_card');
const canApproveCards = hasPermission('approve_card');
const canViewUsers = hasPermission('view_users');
const canEditUsers = hasPermission('edit_users');
const canDeleteUsers = hasPermission('delete_users');
const canManageUserPermissions = hasPermission('manage_user_permissions');
const canManagePartners = hasPermission('view_partners');
const canVerifyPartners = hasPermission('verify_partners');
const canManageReservations = hasPermission('view_reservations');
const canVerifyPayments = hasPermission('verify_payments');
const canManageContent = hasPermission('manage_banners');
const canViewAnalytics = hasPermission('view_analytics');

// Multiple permission check - user must have at least one of the permissions
const hasAnyPermission = (permissionsList) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const user = req.user;
        const userRole = getNormalizedRole(user);
        if (user && userRole) {
            user.role = userRole;
        }

        // Full admin access overrides all permission checks
        if (userRole === 'admin' && user.permissions && user.permissions.includes('full_admin_access')) {
            return next();
        }

        // Legacy admin role check
        if (userRole === 'admin') {
            return next();
        }

        // Check if user has any of the required permissions
        if (user.permissions && permissionsList.some(permission => user.permissions.includes(permission))) {
            return next();
        }

        return res.status(403).json({ 
            error: "Insufficient permissions",
            required: "One of: " + permissionsList.join(', '),
            userPermissions: user.permissions || []
        });
    };
};

// All permissions check - user must have all of the permissions
const hasAllPermissions = (permissionsList) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const user = req.user;
        const userRole = getNormalizedRole(user);
        if (user && userRole) {
            user.role = userRole;
        }

        // Full admin access overrides all permission checks
        if (userRole === 'admin' && user.permissions && user.permissions.includes('full_admin_access')) {
            return next();
        }

        // Legacy admin role check
        if (userRole === 'admin') {
            return next();
        }

        // Check if user has all required permissions
        if (user.permissions && permissionsList.every(permission => user.permissions.includes(permission))) {
            return next();
        }

        return res.status(403).json({ 
            error: "Insufficient permissions",
            required: "All of: " + permissionsList.join(', '),
            userPermissions: user.permissions || []
        });
    };
};
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    const isApiRequest = req.originalUrl.startsWith('/api/') || req.accepts(['json', 'html']) === 'json';
    if (isApiRequest) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    req.flash("error", "You must be logged in to access this page.");
    res.redirect("/login");
};
const isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You are already logged in.");
    res.redirect("/");
};
module.exports = { 
    isAdmin, 
    hasAdminPortalAccess,
    isLoggedIn, 
    isNotLoggedIn,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // Convenience permission functions
    canManageCards,
    canEditCards,
    canDeleteCards,
    canApproveCards,
    canViewUsers,
    canEditUsers,
    canDeleteUsers,
    canManageUserPermissions,
    canManagePartners,
    canVerifyPartners,
    canManageReservations,
    canVerifyPayments,
    canManageContent,
    canViewAnalytics
};