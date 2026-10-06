import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import { authedProcedure } from './context';
import { getCustomerStats, getDashboardStats } from '@/lib/db/queries/stats';
import {
  getCustomers,
  updateCustomer,
  createCustomer,
  deleteCustomer,
} from '@/lib/db/queries/customers';
import { getRequests, deleteRequest } from '@/lib/db/queries/requests';

const customerUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'active', 'inactive']).optional(),
  idConnection: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

const customerDeleteSchema = z.object({
  id: z.string(),
});

const requestDeleteSchema = z.object({
  id: z.string(),
});

const customerCreateSchema = z.object({
  companyName: z.string().min(2).max(255),
  contactName: z.string().min(2).max(255),
  email: z.string().email().max(320),
  countryCode: z.string().regex(/^\+\d{1,4}$/),
  mobile: z.string().regex(/^\d{6,14}$/),
  initialUsers: z.number().int().min(1).max(100),
  notes: z.string().max(2000).nullable().optional(),
});

export const adminStats = authedProcedure.handler(async () => {
  try {
    return await getDashboardStats();
  } catch (error) {
    console.error('Admin stats error:', error);
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Failed to fetch stats',
    });
  }
});

export const adminCustomerStats = authedProcedure.handler(async () => {
  try {
    return await getCustomerStats();
  } catch (error) {
    console.error('Admin customer stats error:', error);
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Failed to fetch customer stats',
    });
  }
});

export const adminCustomersList = authedProcedure
  .input(
    z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(10),
    })
  )
  .handler(async ({ input }) => {
    try {
      const result = await getCustomers(
        input.status,
        input.search,
        input.page,
        input.pageSize
      );
      return result;
    } catch (error) {
      console.error('Admin customers list error:', error);
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to fetch customers',
      });
    }
  });

export const adminCustomerUpdate = authedProcedure
  .input(customerUpdateSchema)
  .handler(async ({ input }) => {
    try {
      await updateCustomer(input.id, {
        status: input.status,
        idConnection: input.idConnection,
        notes: input.notes,
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof Error && error.message === 'Customer not found') {
        throw new ORPCError('NOT_FOUND', { message: 'Customer not found' });
      }
      console.error('Admin customer update error:', error);
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to update customer',
      });
    }
  });

export const adminCustomerCreate = authedProcedure
  .input(customerCreateSchema)
  .handler(async ({ input }) => {
    try {
      const result = await createCustomer({
        ...input,
        notes: input.notes ?? null,
      });
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate')) {
        throw new ORPCError('CONFLICT', {
          message: 'A customer with this email already exists',
        });
      }
      console.error('Admin customer create error:', error);
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to create customer',
      });
    }
  });

export const adminRequestsList = authedProcedure
  .input(
    z.object({
      status: z.string().optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(10),
    })
  )
  .handler(async ({ input }) => {
    try {
      const result = await getRequests(
        input.status,
        input.page,
        input.pageSize
      );
      return result;
    } catch (error) {
      console.error('Admin requests list error:', error);
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to fetch requests',
      });
    }
  });

export const adminCustomerDelete = authedProcedure
  .input(customerDeleteSchema)
  .handler(async ({ input }) => {
    try {
      await deleteCustomer(input.id);
      return { ok: true };
    } catch (error) {
      if (error instanceof Error && error.message === 'Customer not found') {
        throw new ORPCError('NOT_FOUND', { message: 'Customer not found' });
      }
      console.error('Admin customer delete error:', error);
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to delete customer',
      });
    }
  });

export const adminRequestDelete = authedProcedure
  .input(requestDeleteSchema)
  .handler(async ({ input }) => {
    try {
      await deleteRequest(input.id);
      return { ok: true };
    } catch (error) {
      if (error instanceof Error && error.message === 'Request not found') {
        throw new ORPCError('NOT_FOUND', { message: 'Request not found' });
      }
      console.error('Admin request delete error:', error);
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to delete request',
      });
    }
  });

export const adminRouter = {
  stats: adminStats,
  customers: {
    stats: adminCustomerStats,
    list: adminCustomersList,
    update: adminCustomerUpdate,
    create: adminCustomerCreate,
    delete: adminCustomerDelete,
  },
  requests: {
    list: adminRequestsList,
    delete: adminRequestDelete,
  },
};

export type AdminRouter = typeof adminRouter;
