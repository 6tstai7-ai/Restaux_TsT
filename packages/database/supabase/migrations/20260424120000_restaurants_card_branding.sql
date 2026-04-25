alter table restaurants
  add column if not exists card_bg_color text not null default '#18181b',
  add column if not exists card_text_color text not null default '#ffffff',
  add column if not exists card_label_color text not null default '#a1a1aa',
  add column if not exists card_description text;
