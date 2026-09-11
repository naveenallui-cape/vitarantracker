import { EmployeesService } from './employees.service';
import { AppException } from '../common/errors/app.exception';

describe('EmployeesService', () => {
  const prisma = {
    employee: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const auditLogs = { record: jest.fn() };
  const service = new EmployeesService(prisma as never, auditLogs as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an employee and writes a safe audit log', async () => {
    prisma.employee.findUnique.mockResolvedValue(null);
    prisma.employee.create.mockResolvedValue({
      id: 'emp-uuid',
      employeeId: 'EMP001',
      name: 'Rahul',
      email: 'rahul@vitaran.com',
      department: 'Engineering',
      designation: 'Engineer',
      status: 'ACTIVE',
    });

    const created = await service.create(
      {
        employeeId: 'EMP001',
        name: 'Rahul',
        email: 'rahul@vitaran.com',
        department: 'Engineering',
        designation: 'Engineer',
      },
      'admin-1',
    );

    expect(created.employeeId).toBe('EMP001');
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE_EMPLOYEE',
        metadata: expect.not.objectContaining({
          password: expect.anything(),
        }),
      }),
    );
  });

  it('searches employees by employee ID, name, email, and department', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.findMany({
      search: 'Rahul',
      department: 'Engineering',
      status: 'ACTIVE',
      page: 1,
      limit: 20,
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    const findMany = prisma.employee.findMany;
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          department: { equals: 'Engineering', mode: 'insensitive' },
          status: 'ACTIVE',
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.anything() }),
            expect.objectContaining({ email: expect.anything() }),
            expect.objectContaining({ employeeId: expect.anything() }),
          ]),
        }),
      }),
    );
  });

  it('rejects duplicate employee IDs', async () => {
    prisma.employee.findUnique.mockResolvedValue({ id: 'exists' });

    await expect(
      service.create(
        {
          employeeId: 'EMP001',
          name: 'Rahul',
          email: 'rahul@vitaran.com',
          department: 'Engineering',
          designation: 'Engineer',
        },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(AppException);
  });
});
