export const applyImageApproval = (figure, newCandidates, approved) => {
  figure.imageApproved = approved;
  if (approved) newCandidates.delete(figure.id);
};

export const shouldCollapseImageReview = (figure, newCandidateCount) =>
  figure.imageApproved && !figure.marked && newCandidateCount === 0;
