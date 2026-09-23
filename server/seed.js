/**
 * Idempotent seed script for MoveInSync VMS.
 *
 * Safe to run multiple times — uses findOneAndUpdate with upsert for all records.
 * Only creates missing data; does NOT delete existing records.
 *
 * Usage:  npm run seed
 *         npm run seed -- --fresh   (wipes DB first, then re-seeds)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User        = require('./src/models/User');
const Visitor     = require('./src/models/Visitor');
const Approval    = require('./src/models/Approval');
const VisitorPass = require('./src/models/VisitorPass');
const Visit       = require('./src/models/Visit');
const AuditLog    = require('./src/models/AuditLog');
const { generatePass } = require('./src/services/passService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/moveinsync_vms';
const FRESH     = process.argv.includes('--fresh');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Upsert a user by email. Hashes the password using Mongoose pre-save hook.
 * Skips the update if the user already exists (preserves any manual changes).
 */
const upsertUser = async (data) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    console.log(`  ↳ User '${data.email}' already exists — skipping`);
    return existing;
  }
  const user = new User(data);
  await user.save(); // triggers bcrypt pre-save hook
  console.log(`  ✚ Created user '${data.email}' [${data.role}]`);
  return user;
};

/**
 * Upsert a visitor by phone (unique enough for demo data).
 */
const upsertVisitor = async (data) => {
  const existing = await Visitor.findOne({ phone: data.phone });
  if (existing) {
    console.log(`  ↳ Visitor '${data.fullName}' already exists — skipping`);
    return existing;
  }
  const visitor = await Visitor.create(data);
  console.log(`  ✚ Created visitor '${data.fullName}'`);
  return visitor;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── Optional hard-reset ──────────────────────────────────────────────────
    if (FRESH) {
      console.log('🗑️  --fresh flag detected — wiping existing data...');
      await Promise.all([
        User.deleteMany({}),
        Visitor.deleteMany({}),
        Approval.deleteMany({}),
        VisitorPass.deleteMany({}),
        Visit.deleteMany({}),
        AuditLog.deleteMany({}),
      ]);
      console.log('   Done.\n');
    }

    // ── 1. Users ─────────────────────────────────────────────────────────────
    console.log('👥 Seeding users...');

    const admin = await upsertUser({
      name: 'Pranshu Chauhan',
      email: 'admin@moveinsync.com',
      password: 'Admin@123',
      role: 'ADMIN',
      department: 'Administration',
      phone: '+91 9876543210',
    });

    const host1 = await upsertUser({
      name: 'Aarav Mehta',
      email: 'host@moveinsync.com',
      password: 'Host@123',
      role: 'HOST',
      department: 'Engineering',
      phone: '+91 9876543211',
    });

    const host2 = await upsertUser({
      name: 'Ananya Rao',
      email: 'host2@moveinsync.com',
      password: 'Host@123',
      role: 'HOST',
      department: 'People Operations',
      phone: '+91 9876543212',
    });

    const host3 = await upsertUser({
      name: 'Vikram Singh',
      email: 'host3@moveinsync.com',
      password: 'Host@123',
      role: 'HOST',
      department: 'Finance',
      phone: '+91 9876543215',
    });

    const frontDesk1 = await upsertUser({
      name: 'Meera Nair',
      email: 'frontdesk@moveinsync.com',
      password: 'Desk@123',
      role: 'FRONT_DESK',
      department: 'Security',
      phone: '+91 9876543213',
    });

    const frontDesk2 = await upsertUser({
      name: 'Rohan Sharma',
      email: 'frontdesk2@moveinsync.com',
      password: 'Desk@123',
      role: 'FRONT_DESK',
      department: 'Reception',
      phone: '+91 9876543214',
    });

    // ── 2. Date helpers ───────────────────────────────────────────────────────
    const today     = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek  = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);

    // ── 3. Visitors ───────────────────────────────────────────────────────────
    console.log('\n🧑‍💼 Seeding visitors...');

    // [0] Today — CHECKED_IN
    const v0 = await upsertVisitor({
      fullName: 'Rahul Verma',         phone: '+91 9811234567',
      email: 'rahul.verma@acmetech.com', company: 'Acme Technologies',
      purpose: 'Meeting',  hostId: host1._id, department: 'Engineering',
      visitDate: today, startTime: '10:00', endTime: '12:00',
      status: 'CHECKED_IN', createdBy: host1._id,
    });

    // [1] Today — APPROVED (not yet checked in)
    const v1 = await upsertVisitor({
      fullName: 'Priya Sharma', phone: '+91 9822234567',
      email: 'priya.s@globalcorp.com', company: 'Global Corp',
      purpose: 'Business Guest', hostId: host2._id, department: 'People Operations',
      visitDate: today, startTime: '14:00', endTime: '16:00',
      status: 'APPROVED', createdBy: host2._id,
    });

    // [2] Today — PENDING
    const v2 = await upsertVisitor({
      fullName: 'Karan Malhotra', phone: '+91 9833234567',
      email: 'karan@startup.io', company: 'StartupIO',
      purpose: 'Interview', hostId: host2._id, department: 'People Operations',
      visitDate: today, startTime: '11:00', endTime: '12:00',
      status: 'PENDING', createdBy: admin._id,
    });

    // [3] Today — PENDING
    const v3 = await upsertVisitor({
      fullName: 'Sneha Patel', phone: '+91 9844234567',
      email: 'sneha@vendorco.com', company: 'Vendor Co',
      purpose: 'Vendor', hostId: host1._id, department: 'Engineering',
      visitDate: today, startTime: '09:30', endTime: '10:30',
      status: 'PENDING', createdBy: admin._id,
    });

    // [4] Today — CHECKED_OUT
    const v4 = await upsertVisitor({
      fullName: 'Arjun Nair', phone: '+91 9855234567',
      email: 'arjun.n@delivery.in', company: 'QuickDelivery',
      purpose: 'Delivery', hostId: host3._id, department: 'Finance',
      visitDate: today, startTime: '08:00', endTime: '09:00',
      status: 'CHECKED_OUT', createdBy: frontDesk1._id,
    });

    // [5] Yesterday — CHECKED_OUT
    const v5 = await upsertVisitor({
      fullName: 'Deepak Gupta', phone: '+91 9866234567',
      email: 'deepak@consultancy.com', company: 'Gupta Consultancy',
      purpose: 'Meeting', hostId: host1._id, department: 'Engineering',
      visitDate: yesterday, startTime: '10:00', endTime: '11:00',
      status: 'CHECKED_OUT', createdBy: host1._id,
    });

    // [6] Tomorrow — PRE_APPROVED
    const v6 = await upsertVisitor({
      fullName: 'Neha Singh', phone: '+91 9877234567',
      email: 'neha.singh@partner.com', company: 'Partner Solutions',
      purpose: 'Meeting', hostId: host1._id, department: 'Engineering',
      visitDate: tomorrow, startTime: '10:00', endTime: '11:30',
      status: 'PRE_APPROVED', isPreApproved: true, createdBy: host1._id,
    });

    // [7] Next week — PRE_APPROVED
    const v7 = await upsertVisitor({
      fullName: 'Ravi Kumar', phone: '+91 9888234567',
      email: 'ravi@maintenanceco.com', company: 'Maintenance Corp',
      purpose: 'Maintenance', hostId: host3._id, department: 'Finance',
      visitDate: nextWeek, startTime: '09:00', endTime: '13:00',
      status: 'PRE_APPROVED', isPreApproved: true, createdBy: admin._id,
    });

    // [8] REJECTED
    const v8 = await upsertVisitor({
      fullName: 'Unknown Visitor', phone: '+91 9899234567',
      company: 'Unknown Co', purpose: 'Other',
      hostId: host2._id, department: 'People Operations',
      visitDate: yesterday, startTime: '15:00', endTime: '16:00',
      status: 'REJECTED', createdBy: admin._id,
    });

    const visitors = [v0, v1, v2, v3, v4, v5, v6, v7, v8];

    // ── 4. Approvals ──────────────────────────────────────────────────────────
    console.log('\n✅ Seeding approvals...');

    const approvalDefs = [
      { visitorId: v0._id, hostId: host1._id, requestedBy: host1._id, status: 'APPROVED', approvedAt: new Date() },
      { visitorId: v1._id, hostId: host2._id, requestedBy: host2._id, status: 'APPROVED', approvedAt: new Date() },
      { visitorId: v2._id, hostId: host2._id, requestedBy: admin._id, status: 'PENDING' },
      { visitorId: v3._id, hostId: host1._id, requestedBy: admin._id, status: 'PENDING' },
      { visitorId: v4._id, hostId: host3._id, requestedBy: frontDesk1._id, status: 'APPROVED', approvedAt: new Date() },
      { visitorId: v5._id, hostId: host1._id, requestedBy: host1._id, status: 'APPROVED', approvedAt: new Date() },
      { visitorId: v6._id, hostId: host1._id, requestedBy: host1._id, status: 'APPROVED', approvedAt: new Date() },
      { visitorId: v7._id, hostId: host3._id, requestedBy: admin._id, status: 'APPROVED', approvedAt: new Date() },
      { visitorId: v8._id, hostId: host2._id, requestedBy: admin._id, status: 'REJECTED', rejectedAt: new Date(), remarks: 'Unverified visitor, access denied.' },
    ];

    const approvals = [];
    for (const def of approvalDefs) {
      const existing = await Approval.findOne({ visitorId: def.visitorId });
      if (existing) {
        console.log(`  ↳ Approval for '${def.visitorId}' already exists — skipping`);
        approvals.push(existing);
      } else {
        const a = await Approval.create(def);
        approvals.push(a);
        console.log(`  ✚ Created approval [${def.status}]`);
      }
    }

    // ── 5. Visitor Passes ─────────────────────────────────────────────────────
    console.log('\n🎫 Seeding visitor passes...');
    for (const idx of [0, 1, 4, 5, 6, 7]) {
      const v = visitors[idx];
      const existingPass = await VisitorPass.findOne({ visitorId: v._id });
      if (existingPass) {
        console.log(`  ↳ Pass for '${v.fullName}' already exists — skipping`);
        continue;
      }
      try {
        await generatePass(v._id, admin._id);
        console.log(`  ✚ Generated pass for '${v.fullName}'`);
      } catch (e) {
        console.log(`  ⚠ Pass skipped for '${v.fullName}': ${e.message}`);
      }
    }

    // ── 6. Visit Records ──────────────────────────────────────────────────────
    console.log('\n📋 Seeding visit records...');

    const visitDefs = [
      {
        visitorId: v0._id,
        checkInTime: (() => { const d = new Date(today); d.setHours(10, 5, 0, 0); return d; })(),
        checkedInBy: frontDesk1._id,
      },
      {
        visitorId: v4._id,
        checkInTime:  (() => { const d = new Date(today); d.setHours(8, 10, 0, 0); return d; })(),
        checkOutTime: (() => { const d = new Date(today); d.setHours(8, 55, 0, 0); return d; })(),
        checkedInBy: frontDesk1._id,
        checkedOutBy: frontDesk1._id,
        durationMinutes: 45,
      },
      {
        visitorId: v5._id,
        checkInTime:  (() => { const d = new Date(yesterday); d.setHours(10, 2, 0, 0); return d; })(),
        checkOutTime: (() => { const d = new Date(yesterday); d.setHours(11, 8, 0, 0); return d; })(),
        checkedInBy: frontDesk2._id,
        checkedOutBy: frontDesk2._id,
        durationMinutes: 66,
      },
    ];

    for (const def of visitDefs) {
      const existing = await Visit.findOne({ visitorId: def.visitorId });
      if (existing) {
        console.log(`  ↳ Visit for visitor already exists — skipping`);
        continue;
      }
      await Visit.create(def);
      console.log(`  ✚ Created visit record`);
    }

    // ── 7. Audit Logs ─────────────────────────────────────────────────────────
    console.log('\n📝 Seeding audit logs...');
    const auditCount = await AuditLog.countDocuments({});
    if (auditCount === 0) {
      await AuditLog.create([
        { actor: admin._id,      actorName: 'Pranshu Chauhan', action: 'USER_LOGIN',         entityType: 'User',     entityId: admin._id,      metadata: { role: 'ADMIN' } },
        { actor: host1._id,      actorName: 'Aarav Mehta',     action: 'VISITOR_CREATED',    entityType: 'Visitor',  entityId: v0._id,         metadata: { visitorName: 'Rahul Verma' } },
        { actor: host1._id,      actorName: 'Aarav Mehta',     action: 'VISITOR_APPROVED',   entityType: 'Approval', entityId: approvals[0]._id, metadata: { visitorName: 'Rahul Verma' } },
        { actor: frontDesk1._id, actorName: 'Meera Nair',      action: 'VISITOR_CHECKED_IN', entityType: 'Visit',    entityId: v0._id,         metadata: { visitorName: 'Rahul Verma' } },
        { actor: host2._id,      actorName: 'Ananya Rao',      action: 'VISITOR_REJECTED',   entityType: 'Approval', entityId: approvals[8]._id, metadata: { visitorName: 'Unknown Visitor', reason: 'Unverified' } },
        { actor: frontDesk2._id, actorName: 'Rohan Sharma',    action: 'VISITOR_CHECKED_OUT',entityType: 'Visit',    entityId: v5._id,         metadata: { visitorName: 'Deepak Gupta' } },
        { actor: admin._id,      actorName: 'Pranshu Chauhan', action: 'PRE_APPROVAL_CREATED', entityType: 'Visitor', entityId: v6._id,        metadata: { visitorName: 'Neha Singh' } },
      ]);
      console.log('  ✚ Created 7 audit log entries');
    } else {
      console.log(`  ↳ ${auditCount} audit logs exist — skipping`);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n🌱 Seed completed successfully!');
    console.log('\nDemo Credentials:');
    console.log('  Admin:        admin@moveinsync.com      / Admin@123');
    console.log('  Host 1:       host@moveinsync.com       / Host@123');
    console.log('  Host 2:       host2@moveinsync.com      / Host@123');
    console.log('  Front Desk 1: frontdesk@moveinsync.com  / Desk@123');
    console.log('  Front Desk 2: frontdesk2@moveinsync.com / Desk@123');
    console.log('\nRun with --fresh to wipe DB before seeding.');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message || err);
    process.exit(1);
  }
};

seed();
