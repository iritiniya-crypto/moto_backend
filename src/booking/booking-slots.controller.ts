import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { BookingSlotsService } from './booking-slots.service';
import { CancelBookingSlotDto } from './dto/cancel-booking-slot.dto';
import { ConfirmBookingSlotDto } from './dto/confirm-booking-slot.dto';
import { CreateBookingSlotDto } from './dto/create-booking-slot.dto';
import { FindBookingSlotsQueryDto } from './dto/find-booking-slots-query.dto';
import { RequestBookingSlotDto } from './dto/request-booking-slot.dto';
import { RescheduleBookingSlotDto } from './dto/reschedule-booking-slot.dto';
import { UpdateBookingSlotDto } from './dto/update-booking-slot.dto';

@Controller('booking-slots')
export class BookingSlotsController {
  constructor(private readonly bookingSlotsService: BookingSlotsService) {}

  @Get()
  findAll(@Query() query: FindBookingSlotsQueryDto) {
    return this.bookingSlotsService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateBookingSlotDto) {
    return this.bookingSlotsService.create(dto);
  }

  @Patch(':slotId')
  update(@Param('slotId', ParseUUIDPipe) slotId: string, @Body() dto: UpdateBookingSlotDto) {
    return this.bookingSlotsService.update(slotId, dto);
  }

  @Delete(':slotId')
  remove(@Param('slotId', ParseUUIDPipe) slotId: string) {
    return this.bookingSlotsService.remove(slotId);
  }

  @Post(':slotId/request')
  request(@Param('slotId', ParseUUIDPipe) slotId: string, @Body() dto: RequestBookingSlotDto) {
    return this.bookingSlotsService.request(slotId, dto);
  }

  @Post(':slotId/confirm')
  confirm(@Param('slotId', ParseUUIDPipe) slotId: string, @Body() dto: ConfirmBookingSlotDto) {
    return this.bookingSlotsService.confirm(slotId, dto);
  }

  @Post(':slotId/reschedule')
  reschedule(@Param('slotId', ParseUUIDPipe) slotId: string, @Body() dto: RescheduleBookingSlotDto) {
    return this.bookingSlotsService.reschedule(slotId, dto);
  }

  @Post(':slotId/decline')
  decline(@Param('slotId', ParseUUIDPipe) slotId: string) {
    return this.bookingSlotsService.decline(slotId);
  }

  @Post(':slotId/cancel')
  cancel(@Param('slotId', ParseUUIDPipe) slotId: string, @Body() dto: CancelBookingSlotDto) {
    return this.bookingSlotsService.cancel(slotId, dto);
  }
}
