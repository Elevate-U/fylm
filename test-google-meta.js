console.log(JSON.stringify(window.supabase.auth.getUser().then(({data}) => console.log(data.user.user_metadata)), null, 2));
