import { gql, DocumentNode } from "@apollo/client";

// TypeScript interfaces for the links query response
export interface LinkItem {
  id: string;
  target_url: string;
  domain: string;
  image_url?: string;
  title: string;
  notes?: string;
  tags?: string;
  description?: string;
  favicon_url?: string;
  created_at: string;
  summary?: string;
  updated_at: string;
}

export interface LinksResponse {
  links: LinkItem[];
}

export interface LinksVariables {
  query: string;
}

// String version of the GraphQL query for background script communication
export const LINKS_QUERY_STRING = `
  query Links($query: String!) {
    links(query: $query) {
      id
      target_url
      domain
      image_url
      title
      notes
      tags
      description
      favicon_url
      created_at
      summary
      updated_at
    }
  }
`;

// GraphQL query for Apollo Client if needed
export const LINKS_QUERY: DocumentNode = gql`
  query Links($query: String!) {
    links(query: $query) {
      id
      target_url
      domain
      image_url
      title
      notes
      tags
      description
      favicon_url
      created_at
      summary
      updated_at
    }
  }
`;

// Export for backward compatibility
export const GET_LINKS = LINKS_QUERY;

export const QUERY_LINK = gql`
  query Link($id: ID!) {
    link(id: $id) {
      id
      title
      tags
    }
  }
`;

export const QUERY_LINKS = (perPage: number = 20) => gql`
	query Links {
	    links(perPage: ${perPage}) {
	        broken
	        created_at
	        description
	        domain
	        favicon_url
	        id
	        image_url
	        notes
	        stacks
	        tags
	        target_url
	        title
					summary
					link_content
	        updated_at
					link_type
          link_locations {
            id
            latitude
            location_name
            longitude
        }
					media_files {
            file_url
            filename
            id
            metadata
          }
          default_image {
              file_url
              filename
              id
              metadata
          }
          images {
              file_url
              filename
              id
              metadata
          }
          screenshot_url
	        viewing_preference
			annotations_count
			user_repositories {
            id
            name
            repository_member_limit
            repository_type
            members {
                email
                id
                is_invite_pending
                job_title
                name
                phone
                profile_image_url
                role
            }
        }
					user {
					  	id
						email
						profile_image_url
						name
					}
					annotations {
									created_at
									id
									selected_text
									annotation_comments {
                              comment
                              id
                              author {
                              email
                              id
                              image_url
                              name
                              }
                        }
                        author {
                            email
                            id
                            image_url
                            name
                      }
               }
	        collections {
	            cover_image_url
	            created_at
	            description
	            emoji
	            id
	            links_count
	            parent_id
	            pinned
	            public_visible
	            shared_link
	            slug
	            title
	            visual_order
	        }
	    }
	}
`;

export const QUERY_LINKS_STRING = (perPage: number = 20) => `
	query Links {
	    links(perPage: ${perPage}) {
	        broken
	        created_at
	        description
	        domain
	        favicon_url
	        id
	        image_url
	        notes
	        stacks
	        tags
	        target_url
	        title
					summary
					link_content
	        updated_at
					link_type
          link_locations {
            id
            latitude
            location_name
            longitude
        }
					media_files {
            file_url
            filename
            id
            metadata
          }
          default_image {
              file_url
              filename
              id
              metadata
          }
          images {
              file_url
              filename
              id
              metadata
          }
          screenshot_url
	        viewing_preference
			annotations_count
			user_repositories {
            id
            name
            repository_member_limit
            repository_type
            members {
                email
                id
                is_invite_pending
                job_title
                name
                phone
                profile_image_url
                role
            }
        }
					user {
					  	id
						email
						profile_image_url
						name
					}
					annotations {
									created_at
									id
									selected_text
									annotation_comments {
                              comment
                              id
                              author {
                              email
                              id
                              image_url
                              name
                              }
                        }
                        author {
                            email
                            id
                            image_url
                            name
                      }
               }
	        collections {
	            cover_image_url
	            created_at
	            description
	            emoji
	            id
	            links_count
	            parent_id
	            pinned
	            public_visible
	            shared_link
	            slug
	            title
	            visual_order
	        }
	    }
	}
`;

export const RECALL_LINKS_QUERY_STRING = (
  orderBy: number,
  page: number,
  perPage: number,
  domain?: string,
  tags?: string[],
  collection_ids?: string[],
  repository_id?: string
) => `query Links {
    recall_links(
      page: ${page},
      perPage: ${perPage},
      domain: ${domain ? `"${domain}"` : null},
      tags: ${tags ? JSON.stringify(tags) : null}
      collectionIds:${collection_ids ? JSON.stringify(collection_ids) : null}
      repositoryId:${repository_id ? `"${repository_id}"` : null}
      orderBy: ${orderBy},
    ) {
      broken
	        created_at
	        description
	        domain
	        favicon_url
	        id
	        image_url
	        notes
	        stacks
	        tags
	        target_url
	        title
	        updated_at
	        viewing_preference
					annotations_count
          is_user_page
          link_type
      user_page{
	      id
	      content
      }
					user {
					  id
						email
						profile_image_url
						name
					}
					

    }
  }
`;
export const RECALL_LINKS_QUERY = (
  orderBy: number,
  page: number,
  perPage: number,
  domain?: string,
  tags?: string[],
  collection_ids?: string[],
  repository_id?: string
) => gql`
  query Links {
    recall_links(
      page: ${page},
      perPage: ${perPage},
      domain: ${domain ? `"${domain}"` : null},
      tags: ${tags ? JSON.stringify(tags) : null}
      collectionIds:${collection_ids ? JSON.stringify(collection_ids) : null}
      repositoryId:${repository_id ? `"${repository_id}"` : null}
      orderBy: ${orderBy},
    ) {
      broken
	        created_at
	        description
	        domain
	        favicon_url
	        id
	        image_url
	        notes
	        stacks
	        tags
	        target_url
	        title
	        updated_at
	        viewing_preference
					annotations_count
          is_user_page
          link_type
      user_page{
	      id
	      content
      }
					user {
					  id
						email
						profile_image_url
						name
					}
					annotations {
									created_at
									id
									selected_text
									annotation_comments {
                              comment
                              id
                              author {
                              email
                              id
                              image_url
                              name
                              }
                        }
                        author {
                            email
                            id
                            image_url
                            name
                      }
               }
	        collections {
	            cover_image_url
	            created_at
	            description
	            emoji
	            id
	            links_count
	            parent_id
	            pinned
	            public_visible
	            shared_link
	            slug
	            title
	            visual_order
	        }
    }
  }
`;
export const SIMILAR_LINKS_QUERY = (
  orderBy: number,
  page: number,
  perPage: number,
  domain?: string,
  tags?: string[],
  collection_ids?: string[]
) => gql`
  query Links($linkID: String!) {
    similar_links(
    linkId: $linkID,
     orderBy: ${orderBy},
      page: ${page},
      perPage: ${perPage},
      domain: ${domain ? `"${domain}"` : null},
      tags: ${tags ? JSON.stringify(tags) : null}
      collectionIds:${collection_ids ? JSON.stringify(collection_ids) : null}
    ) {
      broken
	        created_at
	        description
	        domain
	        favicon_url
	        id
	        image_url
	        notes
	        stacks
	        tags
	        target_url
	        title
	        updated_at
	        viewing_preference
					annotations_count
          is_user_page
      user_page{
	      id
	      content
      }
					user {
					  id
						email
						profile_image_url
						name
					}
					annotations {
									created_at
									id
									selected_text
									annotation_comments {
                              comment
                              id
                              author {
                              email
                              id
                              image_url
                              name
                              }
                        }
                        author {
                            email
                            id
                            image_url
                            name
                      }
               }
	        collections {
	            cover_image_url
	            created_at
	            description
	            emoji
	            id
	            links_count
	            parent_id
	            pinned
	            public_visible
	            shared_link
	            slug
	            title
	            visual_order
	        }
    }
  }
`;

export const PUBLIC_RANDOM_LINKS_QUERY = gql`
  query GetPublicRandomLinks {
    public_random_links {
      id
      title
      description
      target_url
      domain
      favicon_url
      screenshot_url
      created_at
    }
  }
`;
