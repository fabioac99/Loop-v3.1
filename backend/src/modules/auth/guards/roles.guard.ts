import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException();

    // Global admins always pass
    if (user.globalRole === 'GLOBAL_ADMIN') return true;

    // Check standard roles
    const hasRole = requiredRoles.some((role) => {
      if (role === 'GLOBAL_ADMIN') return false; // already checked above
      if (role === 'DEPARTMENT_HEAD') return user.departmentRole === 'DEPARTMENT_HEAD';
      return true;
    });

    if (hasRole) return true;

    // Check granular permissions from user_permissions table
    // Map roles to permission names for fallback check
    const roleToPermission: Record<string, string> = {
      'GLOBAL_ADMIN': 'admin.access',
      'DEPARTMENT_HEAD': 'admin.access',
    };

    const permissionsToCheck = requiredRoles
      .map(r => roleToPermission[r])
      .filter(Boolean);

    if (permissionsToCheck.length > 0) {
      try {
        const count = await this.prisma.userPermission.count({
          where: {
            userId: user.id,
            permissionName: { in: permissionsToCheck },
          },
        });
        if (count > 0) return true;
      } catch {}
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
