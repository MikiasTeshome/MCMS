import prisma from '../config/db.js';

export async function getCafeDeskContext(user) {
  const campusId = user?.campusId;
  if (!campusId) {
    const err = new Error('This cafe account is not assigned to a campus.');
    err.code = 'NO_CAMPUS';
    throw err;
  }

  const assignment = await prisma.campusVendorAssignment.findFirst({
    where: { campusId, endedAt: null },
    include: {
      campus: true,
      vendor: true,
    },
  });

  if (!assignment?.campus?.isActive) {
    const err = new Error('This campus is inactive.');
    err.code = 'NO_CAMPUS';
    throw err;
  }

  if (!assignment?.vendor?.isActive) {
    const err = new Error('No cafe vendor is assigned to this campus. Ask HR to assign the current operator.');
    err.code = 'NO_VENDOR';
    throw err;
  }

  return {
    campus: assignment.campus,
    vendor: assignment.vendor,
  };
}
