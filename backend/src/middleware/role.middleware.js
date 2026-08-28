/**
 * Role guard middleware — must be used AFTER authMiddleware.
 * Usage: router.get('/admin/...', authMiddleware, roleMiddleware('admin'), handler)
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied — requires role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
};

export default roleMiddleware;
