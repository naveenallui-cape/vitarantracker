import { HttpStatus, Injectable } from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCodes } from '../common/errors/error-codes';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { normalizePagination, paginate } from '../common/utils/pagination.util';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(dto: CreateEmployeeDto, adminId: string) {
    const existing = await this.prisma.employee.findUnique({
      where: { employeeId: dto.employeeId },
    });
    if (existing) {
      throw new AppException(
        'Employee ID already exists',
        ErrorCodes.EMPLOYEE_ALREADY_EXISTS,
        HttpStatus.CONFLICT,
      );
    }

    const employee = await this.prisma.employee.create({
      data: {
        employeeId: dto.employeeId.trim(),
        name: dto.name.trim(),
        email: dto.email.toLowerCase(),
        department: dto.department.trim(),
        designation: dto.designation.trim(),
        status: EmployeeStatus.ACTIVE,
      },
    });

    await this.auditLogs.record({
      action: 'CREATE_EMPLOYEE',
      adminId,
      employeeId: employee.id,
      metadata: {
        employeeId: employee.employeeId,
        department: employee.department,
      },
    });

    return employee;
  }

  async findMany(query: QueryEmployeesDto) {
    const { page, limit, skip } = normalizePagination(query);
    const where: Prisma.EmployeeWhereInput = {};

    if (query.department) {
      where.department = { equals: query.department, mode: 'insensitive' };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { employeeId: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { department: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              devices: { where: { status: { not: 'REVOKED' } } },
            },
          },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return paginate(
      rows.map(({ _count, ...employee }) => ({
        ...employee,
        hasLinkedDevice: _count.devices > 0,
      })),
      total,
      page,
      limit,
    );
  }

  async findByIdOrCode(idOrCode: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [{ id: idOrCode }, { employeeId: idOrCode }],
      },
      include: {
        _count: {
          select: {
            devices: { where: { status: { not: 'REVOKED' } } },
          },
        },
      },
    });

    if (!employee) {
      throw new AppException(
        'Employee not found',
        ErrorCodes.EMPLOYEE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const { _count, ...rest } = employee;
    return { ...rest, hasLinkedDevice: _count.devices > 0 };
  }

  async update(id: string, dto: UpdateEmployeeDto, adminId: string) {
    const employee = await this.findByIdOrCode(id);
    const updated = await this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        name: dto.name?.trim(),
        email: dto.email?.toLowerCase(),
        department: dto.department?.trim(),
        designation: dto.designation?.trim(),
      },
    });

    await this.auditLogs.record({
      action: 'UPDATE_EMPLOYEE',
      adminId,
      employeeId: updated.id,
      metadata: {
        employeeId: updated.employeeId,
        fields: Object.keys(dto),
      },
    });

    return updated;
  }

  async updateStatus(id: string, status: EmployeeStatus, adminId: string) {
    const employee = await this.findByIdOrCode(id);
    const updated = await this.prisma.employee.update({
      where: { id: employee.id },
      data: { status },
    });

    await this.auditLogs.record({
      action: status === 'ACTIVE' ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE',
      adminId,
      employeeId: updated.id,
      metadata: {
        employeeId: updated.employeeId,
        status,
      },
    });

    return updated;
  }
}
