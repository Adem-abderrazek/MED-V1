/**
 * Doctor Service
 * 
 * Business logic for doctor-related operations.
 * Handles patient management, prescriptions, and medications.
 */

import { prisma } from '@config/database.js';
import { logger } from '@utils/logger.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '@types/errors.js';

export interface DashboardData {
  totalPatients: number;
  recentPatients: any[];
  upcomingAppointments: any[];
  medicationAlerts: any[];
}

export interface PatientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  lastVisit?: Date;
  medicationCount: number;
}

/**
 * Get dashboard data for doctor
 */
export async function getDashboardData(doctorId: string): Promise<DashboardData> {
  try {
    const relationships = await prisma.userRelationship.findMany({
      where: {
        caregiverId: doctorId,
        relationshipType: { in: ['medecin', 'tuteur'] },
        isActive: true,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            lastLogin: true,
          },
        },
      },
    });

    const assignedPatients = relationships.map(rel => rel.patient);
    const totalPatients = assignedPatients.length;

    const recentPatients = assignedPatients
      .sort((a, b) => 
        new Date(b.lastLogin || b.createdAt).getTime() - 
        new Date(a.lastLogin || a.createdAt).getTime()
      )
      .slice(0, 10);

    const assignedPatientIds = assignedPatients.map(p => p.id);
    const medicationAlerts = await prisma.medicationReminder.findMany({
      where: {
        status: { in: ['scheduled', 'sent'] },
        scheduledFor: { lt: new Date() },
        patientId: { in: assignedPatientIds },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 10,
    });

    return {
      totalPatients,
      recentPatients,
      upcomingAppointments: [],
      medicationAlerts,
    };
  } catch (error) {
    logger.error('Error getting doctor dashboard data', error);
    throw new BadRequestError('Failed to get dashboard data');
  }
}

/**
 * Get all patients for doctor
 */
export async function getAllPatients(doctorId: string): Promise<PatientSearchResult[]> {
  try {
    const relationships = await prisma.userRelationship.findMany({
      where: {
        caregiverId: doctorId,
        relationshipType: { in: ['medecin', 'tuteur'] },
        isActive: true,
        patient: { isActive: true },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            lastLogin: true,
            reminders: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: {
        patient: { lastName: 'asc' },
      },
    });

    return relationships.map(relationship => ({
      id: relationship.patient.id,
      firstName: relationship.patient.firstName,
      lastName: relationship.patient.lastName,
      email: relationship.patient.email,
      phoneNumber: relationship.patient.phoneNumber,
      lastVisit: relationship.patient.lastLogin || relationship.patient.createdAt,
      medicationCount: relationship.patient.reminders.length,
    }));
  } catch (error) {
    logger.error('Error getting doctor patients', error);
    throw new BadRequestError('Failed to get patients');
  }
}

/**
 * Search patients
 */
export async function searchPatients(doctorId: string, query: string): Promise<PatientSearchResult[]> {
  try {
    const allPatients = await getAllPatients(doctorId);
    const lowerQuery = query.toLowerCase();

    return allPatients.filter(patient =>
      patient.firstName.toLowerCase().includes(lowerQuery) ||
      patient.lastName.toLowerCase().includes(lowerQuery) ||
      patient.email.toLowerCase().includes(lowerQuery) ||
      patient.phoneNumber.includes(query)
    );
  } catch (error) {
    logger.error('Error searching patients', error);
    throw new BadRequestError('Failed to search patients');
  }
}

/**
 * Get patient profile
 */
export async function getPatientProfile(doctorId: string, patientId: string): Promise<any> {
  try {
    // Verify relationship
    const relationship = await prisma.userRelationship.findFirst({
      where: {
        caregiverId: doctorId,
        patientId,
        relationshipType: { in: ['medecin', 'tuteur'] },
        isActive: true,
      },
    });

    if (!relationship) {
      throw new ForbiddenError('Not authorized to access this patient');
    }

    const patient = await prisma.user.findUnique({
      where: { id: patientId, userType: 'patient' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        lastLogin: true,
        reminders: {
          include: {
            prescription: {
              include: { medication: true },
            },
          },
          orderBy: { scheduledFor: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phoneNumber: patient.phoneNumber,
      lastVisit: patient.lastLogin || patient.createdAt,
      medicationCount: patient.reminders.length,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      throw error;
    }
    logger.error('Error getting patient profile', error);
    throw new BadRequestError('Failed to get patient profile');
  }
}

/**
 * Create prescription
 */
export async function createPrescription(
  doctorId: string,
  prescriptionData: {
    patientId: string;
    medicationName: string;
    dosage?: string;
    frequency?: string;
    duration?: number;
    instructions?: string;
  }
): Promise<any> {
  try {
    // Verify relationship
    const relationship = await prisma.userRelationship.findFirst({
      where: {
        caregiverId: doctorId,
        patientId: prescriptionData.patientId,
        relationshipType: { in: ['medecin', 'tuteur'] },
        isActive: true,
      },
    });

    if (!relationship) {
      throw new ForbiddenError('Not authorized to create prescription for this patient');
    }

    // Create or find medication
    let medication = await prisma.medication.findFirst({
      where: { name: prescriptionData.medicationName },
    });

    if (!medication) {
      medication = await prisma.medication.create({
        data: {
          name: prescriptionData.medicationName,
          dosage: prescriptionData.dosage,
          description: prescriptionData.instructions,
        },
      });
    }

    // Create prescription
    const prescription = await prisma.prescription.create({
      data: {
        patientId: prescriptionData.patientId,
        medicationId: medication.id,
        prescribedBy: doctorId,
        instructions: prescriptionData.instructions,
        customDosage: prescriptionData.dosage,
        startDate: new Date(),
        isChronic: true,
      },
      include: {
        medication: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Prescription created', { doctorId, patientId: prescriptionData.patientId, prescriptionId: prescription.id });
    return prescription;
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw error;
    }
    logger.error('Error creating prescription', error);
    throw new BadRequestError('Failed to create prescription');
  }
}

/**
 * Get patient medications
 */
export async function getPatientMedications(doctorId: string, patientId: string): Promise<any[]> {
  try {
    // Verify relationship
    const relationship = await prisma.userRelationship.findFirst({
      where: {
        caregiverId: doctorId,
        patientId,
        relationshipType: { in: ['medecin', 'tuteur'] },
        isActive: true,
      },
    });

    if (!relationship) {
      throw new ForbiddenError('Not authorized to access this patient');
    }

    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        medication: true,
        doctor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        schedules: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return prescriptions.map(prescription => ({
      id: prescription.id,
      medicationName: prescription.medication.name,
      dosage: prescription.customDosage || prescription.medication.dosage,
      prescribedBy: `${prescription.doctor.firstName} ${prescription.doctor.lastName}`,
      startDate: prescription.startDate,
      endDate: prescription.endDate,
      isChronic: prescription.isChronic,
      instructions: prescription.instructions,
      schedules: prescription.schedules,
    }));
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw error;
    }
    logger.error('Error getting patient medications', error);
    throw new BadRequestError('Failed to get patient medications');
  }
}

/**
 * Add patient medication
 */
export async function addPatientMedication(
  doctorId: string,
  patientId: string,
  medicationData: any
): Promise<any> {
  try {
    // Verify relationship
    const relationship = await prisma.userRelationship.findFirst({
      where: {
        caregiverId: doctorId,
        patientId,
        relationshipType: { in: ['medecin', 'tuteur'] },
        isActive: true,
      },
    });

    if (!relationship) {
      throw new ForbiddenError('Not authorized to add medication for this patient');
    }

    // Create or find medication
    let medication = await prisma.medication.findFirst({
      where: { name: medicationData.medicationName },
    });

    if (!medication) {
      medication = await prisma.medication.create({
        data: {
          name: medicationData.medicationName,
          genericName: medicationData.medicationGenericName,
          dosage: medicationData.medicationDosage,
          form: medicationData.medicationForm,
          description: medicationData.medicationDescription,
          imageUrl: medicationData.medicationImageUrl,
        },
      });
    }

    // Create prescription
    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        medicationId: medication.id,
        prescribedBy: doctorId,
        customDosage: medicationData.customDosage,
        instructions: medicationData.instructions,
        startDate: new Date(),
        endDate: medicationData.endDate ? new Date(medicationData.endDate) : null,
        isChronic: medicationData.isChronic || false,
      },
      include: {
        medication: true,
      },
    });

    // Create schedules if provided
    if (medicationData.schedules && medicationData.schedules.length > 0) {
      await prisma.medicationSchedule.createMany({
        data: medicationData.schedules.map((schedule: any) => ({
          prescriptionId: prescription.id,
          scheduledTime: new Date(schedule.scheduledTime),
          daysOfWeek: schedule.daysOfWeek,
          scheduleType: medicationData.scheduleType || 'daily',
          intervalHours: medicationData.intervalHours,
          isActive: true,
        })),
      });
    }

    logger.info('Medication added to patient', { doctorId, patientId, prescriptionId: prescription.id });
    return prescription;
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw error;
    }
    logger.error('Error adding patient medication', error);
    throw new BadRequestError('Failed to add medication');
  }
}

/**
 * Delete patient relationship
 */
export async function deletePatient(doctorId: string, patientId: string): Promise<void> {
  try {
    const relationship = await prisma.userRelationship.findFirst({
      where: {
        caregiverId: doctorId,
        patientId,
        relationshipType: { in: ['medecin', 'tuteur'] },
      },
    });

    if (!relationship) {
      throw new NotFoundError('Patient relationship not found');
    }

    await prisma.userRelationship.update({
      where: { id: relationship.id },
      data: { isActive: false },
    });

    logger.info('Patient relationship deleted', { doctorId, patientId });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Error deleting patient relationship', error);
    throw new BadRequestError('Failed to delete patient relationship');
  }
}


