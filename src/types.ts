interface TwitchStream {
  user_name: string;
  type: string;
  title: string;
  game_name: string;
  thumbnail_url: string;
}

export interface TwitchStreamsResponse {
  data: TwitchStream[];
}

interface TwitchUser {
  id: string;
  login: string;
  profile_image_url: string;
}

export interface TwitchUsersResponse {
  data: TwitchUser[];
}