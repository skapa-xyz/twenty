import { Injectable, type NestMiddleware } from '@nestjs/common';

import { type NextFunction, type Request, type Response } from 'express';
import { DataSource } from 'typeorm';

@Injectable()
export class WorkspaceContextMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const workspaceId = req['workspace']?.id;

    if (workspaceId) {
      // Set PostgreSQL session variable for RLS policies
      await this.dataSource.query(
        `SELECT set_config('app.current_workspace_id', $1, true)`,
        [workspaceId],
      );
    }

    next();
  }
}
