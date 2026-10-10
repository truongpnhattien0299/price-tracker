import { Controller, Get, UseGuards } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/strategies/jwt.strategy';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class EntitlementController {
  constructor(private readonly entitlement: EntitlementService) {}

  // Current plan, computed per request (DESIGN.md §5.6): trial days left, Free limits.
  @Get('entitlement')
  get(@CurrentUser() user: AuthUser) {
    return this.entitlement.summary(user.userId);
  }
}
