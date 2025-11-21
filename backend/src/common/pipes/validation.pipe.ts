import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  ValidationError,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance, type ClassConstructor } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<unknown> {
  async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const ctor = metatype as unknown as ClassConstructor<unknown>;
    const object = plainToInstance(ctor, value as object);
    const errors = await validate(object as object);

    if (errors.length > 0) {
      const messages = this.formatErrors(errors);
      throw new BadRequestException({
        message: messages,
        error: 'Validation Failed',
      });
    }

    return object;
  }

  private toValidate(metatype: unknown): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return typeof metatype === 'function' && !types.includes(metatype as any);
  }

  private formatErrors(errors: ValidationError[]): string[] {
    return errors.flatMap((error) => {
      if (error.constraints) {
        return Object.values(error.constraints);
      }
      if (error.children && error.children.length > 0) {
        return this.formatErrors(error.children);
      }
      return [];
    });
  }
}
