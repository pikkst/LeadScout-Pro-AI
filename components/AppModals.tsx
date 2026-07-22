import React from 'react';
import { OutreachPitch, CompanyLead, DealStage } from '../types';
import { LeadCRMModal } from './LeadCRMModal';
import { PitchPreviewModal } from './PitchPreviewModal';

interface AppModalsProps {
  activePitch: OutreachPitch | null;
  isPreviewMode: boolean;
  editedSubject: string;
  editedBody: string;
  isCRMModalOpen: boolean;
  selectedCRMLead: CompanyLead | null;
  focusOptions: { value: string; label: string; icon: string; pitchType: string }[];
  dealStages?: DealStage[];
  onClosePitchPreview: () => void;
  onCloseCRMModal: () => void;
  onSavePitchChanges: () => void;
  onSaveCRMLead: (lead: CompanyLead) => void;
  onTogglePreviewMode: () => void;
  onToggleEditorMode: () => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  activePitch,
  isPreviewMode,
  editedSubject,
  editedBody,
  isCRMModalOpen,
  selectedCRMLead,
  focusOptions,
  dealStages,
  onClosePitchPreview,
  onCloseCRMModal,
  onSavePitchChanges,
  onSaveCRMLead,
  onTogglePreviewMode,
  onToggleEditorMode,
  onSubjectChange,
  onBodyChange,
}) => {
  if (!activePitch && !isCRMModalOpen) return null;

  return (
    <>
      {activePitch && (
        <PitchPreviewModal
          pitch={activePitch}
          isPreviewMode={isPreviewMode}
          editedSubject={editedSubject}
          editedBody={editedBody}
          onClose={onClosePitchPreview}
          onTogglePreviewMode={onTogglePreviewMode}
          onToggleEditorMode={onToggleEditorMode}
          onSubjectChange={onSubjectChange}
          onBodyChange={onBodyChange}
          onSave={onSavePitchChanges}
        />
      )}

      {isCRMModalOpen && (
        <LeadCRMModal
          isOpen={isCRMModalOpen}
          lead={selectedCRMLead}
          focusOptions={focusOptions}
          dealStages={dealStages}
          onClose={onCloseCRMModal}
          onSave={onSaveCRMLead}
        />
      )}
    </>
  );
};
