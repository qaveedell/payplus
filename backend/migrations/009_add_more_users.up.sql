INSERT INTO users (username, password_hash, display_name, role) VALUES
    ('zahedan', '$2a$10$IQPc7.ROySioOEQoeJnI0ujERAkZNVk5EJlAbkNu6PrWR.2pjxQrK', 'Zahedan', 'requester'),
    ('karachi', '$2a$10$aJGa7MxtOA6.Blqm4EhQh.A6ht0Y9O0oSlEbn0.dX97ewyf14ERa.', 'Karachi', 'payer'),
    ('basit', '$2a$10$eh/mFUf6tZp9fYO7Grxe0uz3neVbuly9RWhGfjbvNefaBC2plNEGK', 'Basit', 'requester')
ON CONFLICT (username) DO NOTHING;
