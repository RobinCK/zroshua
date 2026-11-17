import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { HaService } from './ha/ha.service';
import { ConfigService } from './config/config.service';
import { EventsService } from './events/events.service';
import { JournalService } from './journal/journal.service';
import { NotifyService } from './notify/notify.service';
import { WeatherService } from './weather/weather.service';
import { EngineService } from './engine/engine.service';
import { MqttService } from './mqtt/mqtt.service';
import { CardDeployService } from './card/card-deploy.service';
import { ConfigController } from './api/config.controller';
import { ActionsController } from './api/actions.controller';
import { MapController } from './api/map.controller';
import { StatsController } from './api/stats.controller';
import { OneTimeController } from './api/one-time.controller';
import { DevController } from './sim/dev.controller';
import { OverviewController } from './api/overview.controller';
import { OverviewService } from './overview/overview.service';
import { env } from './env';

@Module({
  imports: [DatabaseModule],
  controllers: [
    ConfigController,
    ActionsController,
    MapController,
    StatsController,
    OneTimeController,
    OverviewController,
    // the stand's card page exists only in simulator mode
    ...(env.sim.enabled ? [DevController] : []),
  ],
  providers: [HaService, ConfigService, EventsService, JournalService, NotifyService, WeatherService, EngineService, MqttService, CardDeployService, OverviewService],
})
export class AppModule {}
