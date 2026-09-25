import { gql } from '@apollo/client'

export const CREATE_REPORT_MUTATION = gql`
  mutation CreateReport($targetType: ReportTargetType!, $targetListingId: String, $targetUserId: String, $reason: String!, $message: String) {
    createReport(targetType: $targetType, targetListingId: $targetListingId, targetUserId: $targetUserId, reason: $reason, message: $message) {
      id
      status
    }
  }
`
