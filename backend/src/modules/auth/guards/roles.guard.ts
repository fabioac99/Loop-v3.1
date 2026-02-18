import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException();

    const hasRole = requiredRoles.some((role) => {
      if (role === 'GLOBAL_ADMIN') return user.globalRole === 'GLOBAL_ADMIN';
      if (role === 'DEPARTMENT_HEAD') return user.departmentRole === 'DEPARTMENT_HEAD' || user.globalRole === 'GLOBAL_ADMIN';
      return true;
    });

    if (!hasRole) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
