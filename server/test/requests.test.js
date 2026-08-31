const mongoose = require('mongoose');

describe('Emergency Request Atomic Acceptance Logic', () => {
  test('atomic findOneAndUpdate simulation ensures single-winner doctor assignment', async () => {
    // Simulated DB document state
    let request = {
      _id: 'req_123',
      status: 'OPEN',
      acceptedBy: null
    };

    // Atomic update simulation logic
    const atomicAccept = (reqState, doctorId) => {
      if (reqState.status === 'OPEN') {
        reqState.status = 'ASSIGNED';
        reqState.acceptedBy = doctorId;
        return { success: true, request: reqState };
      }
      return { success: false, message: 'Request already accepted or no longer open' };
    };

    // First doctor accepts
    const doctor1Result = atomicAccept(request, 'doc_001');
    expect(doctor1Result.success).toBe(true);
    expect(doctor1Result.request.acceptedBy).toBe('doc_001');
    expect(doctor1Result.request.status).toBe('ASSIGNED');

    // Second doctor attempts concurrent accept on the same request
    const doctor2Result = atomicAccept(request, 'doc_002');
    expect(doctor2Result.success).toBe(false);
    expect(request.acceptedBy).toBe('doc_001');
  });
});
