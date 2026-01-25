import {
  type CanActivate,
  type ExecutionContext,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { type Observable } from 'rxjs';

export class WorkspaceAuthGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext();
    const request = gqlContext.req;

    const hasWorkspace = request?.workspace !== undefined;

    if (!hasWorkspace) {
      this.logger.debug(
        `WorkspaceAuthGuard: workspace is undefined. Has req: ${!!request}, keys: ${request ? Object.keys(request).slice(0, 10).join(',') : 'N/A'}`,
      );
    }

    return hasWorkspace;
  }
}
