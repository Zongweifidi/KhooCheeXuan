-- Initial schema for Pomodoro Hero
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    level INT DEFAULT 1,
    exp INT DEFAULT 0,
    total_tomatoes INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tomato_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration INT,
    task_name TEXT DEFAULT '专注任务'
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tomato_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Sessions are private" ON public.tomato_sessions FOR ALL USING (auth.uid() = user_id);
