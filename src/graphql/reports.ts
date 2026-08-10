import { gql } from '@apollo/client'

export const CREATE_REPORT_MUTATION = gql`
  mutation CreateReport($targetType: ReportTargetType!, $targetListingId: String, $reason: String!, $message: String) {
    createReport(targetType: $targetType, targetListingId: $targetListingId, reason: $reason, message: $message) {
      id
      status
    }
  }
`
