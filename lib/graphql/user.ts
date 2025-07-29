import { gql } from "@apollo/client";

export type User = {
  description?: string | null;
  email: string;
  id: string;
  is_notification_enabled: boolean;
  job_title?: string | null;
  name?: string | null;
  phone?: string;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  unconfirmed_email?: string | null;
  unique_identity_id: string;
  username?: string | null;
  tags: string[];
  slug: string;
  default_repository: {
    name: string;
    id: string;
  };
  ai_tokens: Array<{
    ai_preferred_model: string;
    ai_provider: string;
    id: string;
    token: string;
  }>;

  is_lifetime_customer: boolean;
  is_paying_customer: boolean;
  plan_type: string;
  can_use_stacks_ai: boolean;
};

export const QUERY_USER = () => gql`
  query User {
    user {
      description
      email
      id
      is_notification_enabled
      job_title
      tags
      name
      slug
      plan_type
      phone
      username
      ai_tokens {
        ai_preferred_model
        ai_provider
        id
        token
      }
      profile_image_url
      is_lifetime_customer
      can_use_stacks_ai
      is_paying_customer
      cover_image_url
      unconfirmed_email
      unique_identity_id
      default_repository {
        id
        name
      }
    }
  }
`;

export const QUERY_USER_STRING = `
query User {
    user {
      description
      email
      id
      is_notification_enabled
      job_title
      tags
      name
      slug
      plan_type
      phone
      username
      ai_tokens {
        ai_preferred_model
        ai_provider
        id
        token
      }
      profile_image_url
      is_lifetime_customer
      can_use_stacks_ai
      is_paying_customer
      cover_image_url
      unconfirmed_email
      unique_identity_id
      default_repository {
        id
        name
      }
    }
  }
`;
