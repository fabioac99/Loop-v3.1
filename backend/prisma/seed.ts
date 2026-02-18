import { PrismaClient, GlobalRole, DepartmentRole, TicketPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding LOOP database...');

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({ where: { slug: 'sales' }, update: {}, create: { name: 'Sales', slug: 'sales', color: '#3b82f6', description: 'Sales department' } }),
    prisma.department.upsert({ where: { slug: 'design' }, update: {}, create: { name: 'Design', slug: 'design', color: '#8b5cf6', description: 'Design and creative' } }),
    prisma.department.upsert({ where: { slug: 'accessories' }, update: {}, create: { name: 'Accessories', slug: 'accessories', color: '#f59e0b', description: 'Accessories and materials' } }),
    prisma.department.upsert({ where: { slug: 'daf' }, update: {}, create: { name: 'DAF', slug: 'daf', color: '#10b981', description: 'Finance and Accounting' } }),
    prisma.department.upsert({ where: { slug: 'info' }, update: {}, create: { name: 'Info', slug: 'info', color: '#ef4444', description: 'Management/Administration' } }),
  ]);

  const [sales, design, accessories, daf, info] = departments;

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@loop.local' },
    update: {},
    create: {
      email: 'admin@loop.local', password: adminPassword,
      firstName: 'System', lastName: 'Admin',
      globalRole: GlobalRole.GLOBAL_ADMIN,
      departmentId: info.id,
      departmentRole: DepartmentRole.DEPARTMENT_HEAD,
    },
  });

  // Create demo users
  const userPassword = await bcrypt.hash('User123!', 12);
  const demoUsers = [
    { email: 'joao.sales@loop.local', firstName: 'João', lastName: 'Silva', departmentId: sales.id, departmentRole: DepartmentRole.DEPARTMENT_HEAD },
    { email: 'maria.sales@loop.local', firstName: 'Maria', lastName: 'Santos', departmentId: sales.id, departmentRole: DepartmentRole.DEPARTMENT_USER },
    { email: 'ana.design@loop.local', firstName: 'Ana', lastName: 'Costa', departmentId: design.id, departmentRole: DepartmentRole.DEPARTMENT_HEAD },
    { email: 'pedro.design@loop.local', firstName: 'Pedro', lastName: 'Oliveira', departmentId: design.id, departmentRole: DepartmentRole.DEPARTMENT_USER },
    { email: 'carlos.acc@loop.local', firstName: 'Carlos', lastName: 'Ferreira', departmentId: accessories.id, departmentRole: DepartmentRole.DEPARTMENT_HEAD },
    { email: 'sofia.daf@loop.local', firstName: 'Sofia', lastName: 'Almeida', departmentId: daf.id, departmentRole: DepartmentRole.DEPARTMENT_HEAD },
    { email: 'rita.info@loop.local', firstName: 'Rita', lastName: 'Pereira', departmentId: info.id, departmentRole: DepartmentRole.DEPARTMENT_USER },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email }, update: {},
      create: { ...u, password: userPassword, globalRole: GlobalRole.USER },
    });
  }

  // Create Request Categories and Subtypes with Form Schemas
  // -- Design Category --
  const designCat = await prisma.requestCategory.upsert({
    where: { departmentId_slug: { departmentId: design.id, slug: 'design' } },
    update: {}, create: { name: 'Design', slug: 'design', departmentId: design.id },
  });

  const designSchemas = {
    artwork: await prisma.formSchema.create({
      data: {
        name: 'Artwork Request', schema: {
          fields: [
            { id: 'reference_images', type: 'IMAGE_UPLOAD', label: 'Reference Images', required: false },
            { id: 'sizes', type: 'MULTI_SELECT', label: 'Sizes', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
            { id: 'materials', type: 'SELECT', label: 'Material', required: true, options: ['Cotton', 'Polyester', 'Silk', 'Linen', 'Wool', 'Denim'] },
            { id: 'colors', type: 'TEXT', label: 'Color Specifications', required: true },
            { id: 'deadline_notes', type: 'TEXTAREA', label: 'Deadline Notes', required: false },
          ],
        },
      },
    }),
    marketing: await prisma.formSchema.create({
      data: {
        name: 'Marketing Design Request', schema: {
          fields: [
            { id: 'campaign_name', type: 'TEXT', label: 'Campaign Name', required: true },
            { id: 'format', type: 'SELECT', label: 'Format', required: true, options: ['Social Media', 'Print', 'Web Banner', 'Email', 'Catalog'] },
            { id: 'dimensions', type: 'TEXT', label: 'Dimensions', required: false },
            { id: 'brand_guidelines', type: 'CHECKBOX', label: 'Follow brand guidelines', required: false, defaultValue: true },
            { id: 'references', type: 'FILE_UPLOAD', label: 'Reference Files', required: false },
          ],
        },
      },
    }),
  };

  const designSubtypes = [
    { name: 'Artwork', slug: 'artwork', formSchemaId: designSchemas.artwork.id, slaResponseHours: 8, slaResolutionHours: 48 },
    { name: '3D Models', slug: '3d-models', slaResponseHours: 8, slaResolutionHours: 72 },
    { name: 'Fabrics (Malhas)', slug: 'fabrics', slaResponseHours: 8, slaResolutionHours: 48 },
    { name: 'Boards', slug: 'boards', slaResponseHours: 8, slaResolutionHours: 48 },
    { name: 'Marketing', slug: 'marketing', formSchemaId: designSchemas.marketing.id, slaResponseHours: 4, slaResolutionHours: 24 },
    { name: 'Showroom Preparation', slug: 'showroom', slaResponseHours: 4, slaResolutionHours: 48 },
  ];

  for (const st of designSubtypes) {
    await prisma.requestSubtype.upsert({
      where: { categoryId_slug: { categoryId: designCat.id, slug: st.slug } },
      update: {}, create: { ...st, categoryId: designCat.id, defaultPriority: TicketPriority.NORMAL },
    });
  }

  // -- DAF Category --
  const dafCat = await prisma.requestCategory.upsert({
    where: { departmentId_slug: { departmentId: daf.id, slug: 'daf' } },
    update: {}, create: { name: 'DAF', slug: 'daf', departmentId: daf.id },
  });

  const dafSchemas = {
    creditNote: await prisma.formSchema.create({
      data: {
        name: 'Credit Note Request', schema: {
          fields: [
            { id: 'invoice_number', type: 'TEXT', label: 'Invoice Number', required: true },
            { id: 'amount', type: 'NUMBER', label: 'Amount', required: true },
            { id: 'currency', type: 'SELECT', label: 'Currency', required: true, options: ['EUR', 'USD', 'GBP'] },
            { id: 'reason', type: 'TEXTAREA', label: 'Reason', required: true },
            { id: 'entity_type', type: 'RADIO_GROUP', label: 'Entity Type', required: true, options: ['Client', 'Supplier'] },
            { id: 'client_name', type: 'TEXT', label: 'Client Name', required: false, condition: { field: 'entity_type', value: 'Client' } },
            { id: 'supplier_name', type: 'TEXT', label: 'Supplier Name', required: false, condition: { field: 'entity_type', value: 'Supplier' } },
          ],
        },
      },
    }),
    payment: await prisma.formSchema.create({
      data: {
        name: 'Payment Request', schema: {
          fields: [
            { id: 'invoice_number', type: 'TEXT', label: 'Invoice Number', required: true },
            { id: 'amount', type: 'NUMBER', label: 'Amount', required: true },
            { id: 'currency', type: 'SELECT', label: 'Currency', required: true, options: ['EUR', 'USD', 'GBP'] },
            { id: 'payment_method', type: 'SELECT', label: 'Payment Method', required: true, options: ['Bank Transfer', 'Check', 'Cash', 'Credit Card'] },
            { id: 'due_date', type: 'DATE', label: 'Payment Due Date', required: true },
            { id: 'supporting_docs', type: 'FILE_UPLOAD', label: 'Supporting Documents', required: false },
          ],
        },
      },
    }),
  };

  const dafSubtypes = [
    { name: 'Emit Credit Note', slug: 'credit-note', formSchemaId: dafSchemas.creditNote.id, actions: { approve: { label: 'Approve', setStatus: 'APPROVED' }, reject: { label: 'Reject', setStatus: 'REJECTED' }, complete: { label: 'Mark Complete', setStatus: 'CLOSED' } } },
    { name: 'Transport Guide', slug: 'transport-guide', actions: { complete: { label: 'Mark Completed', setStatus: 'CLOSED' }, correction: { label: 'Request Correction', setStatus: 'WAITING_REPLY' } } },
    { name: 'Remittance Guide', slug: 'remittance-guide' },
    { name: 'Create Client', slug: 'create-client' },
    { name: 'Create Warehouse', slug: 'create-warehouse' },
    { name: 'Fiscal Information', slug: 'fiscal-info' },
    { name: 'Payments', slug: 'payments', formSchemaId: dafSchemas.payment.id, actions: { approve: { label: 'Approve Payment', setStatus: 'APPROVED' }, reject: { label: 'Reject', setStatus: 'REJECTED' } } },
    { name: 'Proforma Invoice', slug: 'proforma', actions: { approve: { label: 'Approve', setStatus: 'APPROVED' } } },
  ];

  for (const st of dafSubtypes) {
    await prisma.requestSubtype.upsert({
      where: { categoryId_slug: { categoryId: dafCat.id, slug: st.slug } },
      update: {}, create: { ...st, categoryId: dafCat.id, defaultPriority: TicketPriority.NORMAL },
    });
  }

  // -- Info Category --
  const infoCat = await prisma.requestCategory.upsert({
    where: { departmentId_slug: { departmentId: info.id, slug: 'info' } },
    update: {}, create: { name: 'Information', slug: 'info', departmentId: info.id },
  });

  const infoSubtypes = [
    { name: 'Missing Information', slug: 'missing-info' },
    { name: 'General Information', slug: 'general-info' },
    { name: 'Information Divergence', slug: 'divergence' },
    { name: 'Price Calculation Sheet', slug: 'price-calc' },
  ];

  for (const st of infoSubtypes) {
    await prisma.requestSubtype.upsert({
      where: { categoryId_slug: { categoryId: infoCat.id, slug: st.slug } },
      update: {}, create: { ...st, categoryId: infoCat.id, defaultPriority: TicketPriority.NORMAL },
    });
  }

  // Default system settings
  const defaultSettings = [
    { key: 'maxUploadSize', value: 52428800 },
    { key: 'defaultPriority', value: 'NORMAL' },
    { key: 'workingDays', value: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
    { key: 'slaResponseHours', value: 24 },
    { key: 'slaResolutionHours', value: 72 },
    { key: 'ticketPrefix', value: 'LOOP' },
    { key: 'allowedFileTypes', value: ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.zip'] },
    { key: 'smtpHost', value: '' },
    { key: 'smtpPort', value: 587 },
    { key: 'smtpUser', value: '' },
    { key: 'smtpFrom', value: 'noreply@loop.local' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key }, update: {}, create: { key: s.key, value: s.value as any },
    });
  }

  // Initialize ticket counter
  await prisma.ticketCounter.upsert({
    where: { id: 'singleton' }, update: {}, create: { id: 'singleton', counter: 0 },
  });

  console.log('✅ Seed completed!');
  console.log('Admin login: admin@loop.local / Admin123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
