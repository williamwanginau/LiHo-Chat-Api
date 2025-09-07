import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

describe('DTO transforms', () => {
  it('LoginDto email transform: string path (trim + lower) and non-string path', async () => {
    const a = plainToInstance(LoginDto, { email: '  A@B.COM ', password: 'password123' });
    const errorsA = await validate(a);
    expect(errorsA.length).toBe(0);
    expect(a.email).toBe('a@b.com');

    const b = plainToInstance(LoginDto, { email: 123 as unknown as string, password: 'password123' });
    const errorsB = await validate(b);
    expect(errorsB.length).toBeGreaterThan(0); // invalid email
  });

  it('RegisterDto transforms: email, name trim; invalid types are rejected', async () => {
    const a = plainToInstance(RegisterDto, {
      email: '  x@Y.com ',
      name: ' Alice ',
      password: 'password123',
    });
    const errorsA = await validate(a);
    expect(errorsA.length).toBe(0);
    expect(a.email).toBe('x@y.com');
    expect(a.name).toBe('Alice');

    const b = plainToInstance(RegisterDto, {
      email: 123 as unknown as string,
      name: 456 as unknown as string,
      password: 'password123',
    });
    const errorsB = await validate(b);
    expect(errorsB.length).toBeGreaterThan(0);
  });
});

