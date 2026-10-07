import sys
from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.db.session import engine
from app.core.security import hash_password
from app.models.user import User
from app.models.tag import Tag
from app.models.thread import Thread
from app.models.post import Post
from app.models.social import ThreadLike, ThreadRepost, UserFollow, Friendship

MOCK_USERS_DATA = [
    {
        "username": "miles_ahead",
        "email": "miles@nox.fm",
        "bio": "Jazz fusion archivist & Blue Note vinyl collector. Tube amp purist. Listening to Miles, Coltrane, and Herbie.",
        "avatar_url": "/assets/avatars/miles_ahead.jpg",
        "banner_url": "/assets/editorial/topster-nine.svg",
    },
    {
        "username": "shoegaze_queen",
        "email": "astra@nox.fm",
        "bio": "Reverb tails, dreampop tapes, & 90s Slowdive bootlegs. Fender Jaguar plugged into three delay pedals.",
        "avatar_url": "/assets/avatars/shoegaze_queen.jpg",
        "banner_url": "/assets/editorial/gig-flyer.svg",
    },
    {
        "username": "crate_digger_99",
        "email": "theo@nox.fm",
        "bio": "Sampling dusty 45s, 80s Japanese City Pop, and obscure funk breaks. Always at the local record shop.",
        "avatar_url": "/assets/avatars/crate_digger_99.jpg",
        "banner_url": "/assets/editorial/vinyl-desk.svg",
    },
    {
        "username": "modular_synth",
        "email": "kaelen@nox.fm",
        "bio": "Eurorack walls, patch cables, and generative ambient frequencies. Buchla & Moog experimentalist.",
        "avatar_url": "/assets/avatars/modular_synth.jpg",
        "banner_url": "/assets/editorial/editorial-portrait.svg",
    },
    {
        "username": "dub_techno_echo",
        "email": "soren@nox.fm",
        "bio": "Basic Channel disciple. Chain-smoking tape delays, chord stabs, and 4 AM underground Berlin soundscapes.",
        "avatar_url": "/assets/avatars/dub_techno_echo.jpg",
        "banner_url": "/assets/editorial/gig-flyer.svg",
    },
    {
        "username": "post_punk_pete",
        "email": "pete@nox.fm",
        "bio": "Chorus basslines, cold wave drum machines, and monochrome record sleeves. Joy Division, The Cure, Molchat Doma.",
        "avatar_url": "/assets/avatars/post_punk_pete.jpg",
        "banner_url": "/assets/editorial/industrial.svg",
    },
    {
        "username": "audiophile_dan",
        "email": "dan@nox.fm",
        "bio": "Lossless FLAC only. Sennheiser HD800S & R2R DACs. Let's debate room acoustic treatment and mastering dynamics.",
        "avatar_url": "/assets/avatars/audiophile_dan.jpg",
        "banner_url": "/assets/editorial/topster-nine.svg",
    },
    {
        "username": "ambient_drifter",
        "email": "lyra@nox.fm",
        "bio": "Eno disciple. Field recordings of midnight rain, cassette tape loops, and minimal piano meditations.",
        "avatar_url": "/assets/avatars/ambient_drifter.jpg",
        "banner_url": "/assets/editorial/lofi-tape.svg",
    },
    {
        "username": "amanx98",
        "email": "amanx98@nox.fm",
        "bio": "Crate digger, vinyl archivist & audiophile curator on Nox.",
        "avatar_url": "/assets/avatars/amanx98.jpg",
        "banner_url": "/assets/editorial/vinyl-desk.svg",
    },
]

MOCK_TAGS_DATA = [
    {"name": "Jazz", "type": "genre"},
    {"name": "Shoegaze", "type": "genre"},
    {"name": "Ambient", "type": "genre"},
    {"name": "Dub Techno", "type": "genre"},
    {"name": "Post-Punk", "type": "genre"},
    {"name": "City Pop", "type": "genre"},
    {"name": "Vinyl Setup", "type": "topic"},
    {"name": "Crate Digging", "type": "topic"},
]

def seed_database(session: Session, force: bool = False):
    existing_users = session.exec(select(User)).all()
    if existing_users and not force:
        print(f"[Seed] Database already has {len(existing_users)} users. Skipping automatic seed.")
        return

    print("[Seed] Seeding mock tastemaker users, tags, threads, comments, follows, and friendships...")

    # 1. Create or fetch tags
    tag_map = {}
    for t_data in MOCK_TAGS_DATA:
        existing_tag = session.exec(select(Tag).where(Tag.name == t_data["name"])).first()
        if not existing_tag:
            new_tag = Tag(name=t_data["name"], type=t_data["type"])
            session.add(new_tag)
            session.commit()
            session.refresh(new_tag)
            tag_map[t_data["name"]] = new_tag
        else:
            tag_map[t_data["name"]] = existing_tag

    # 2. Create mock users
    user_map = {}
    base_password_hash = hash_password("password123")

    for u_data in MOCK_USERS_DATA:
        existing = session.exec(select(User).where(User.username == u_data["username"])).first()
        if not existing:
            user = User(
                username=u_data["username"],
                email=u_data["email"],
                password_hash=base_password_hash,
                bio=u_data["bio"],
                avatar_url=u_data["avatar_url"],
                banner_url=u_data["banner_url"],
                created_at=datetime.utcnow() - timedelta(days=30),
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            user_map[u_data["username"]] = user
        else:
            user_map[u_data["username"]] = existing

    # 3. Create rich discussion threads
    threads_data = [
        {
            "author": "miles_ahead",
            "tag": "Jazz",
            "title": "Why the 1959 Miles Davis 'Kind of Blue' mono pressing still hits differently",
            "body": "[Discussion] Track Reference: Miles Davis - So What\n\nThere is something magical about the room acoustics captured on Columbia 30th Street Studio. The tape saturation on Paul Chambers' opening bassline is so round and warm in mono compared to the wide stereo pan. What is your go-to pressing?",
            "image_url": "/assets/editorial/vinyl-desk.svg",
            "media_type": "image",
            "created_offset_hours": 72,
            "replies": [
                {
                    "author": "audiophile_dan",
                    "body": "Completely agree on the mono mix. The Kevin Gray remaster cut directly from the original mono master tapes gives Bill Evans' piano so much natural decay without any artificial stereo splay.",
                    "created_offset_hours": 70,
                },
                {
                    "author": "crate_digger_99",
                    "body": "Found a 1970s Japanese CBS/Sony pressing last month in Shibuya for 2,000 yen. The vinyl compound is dead quiet. You can hear Miles stepping back from the mic between trumpet phrases.",
                    "created_offset_hours": 68,
                },
                {
                    "author": "miles_ahead",
                    "body": "That Japanese CBS pressing is legendary! Hold onto that one Theo, the quiet noise floor makes all the difference in dynamic range.",
                    "created_offset_hours": 65,
                },
            ],
        },
        {
            "author": "shoegaze_queen",
            "tag": "Shoegaze",
            "title": "Building the ultimate wall of sound: pedal chain order debate",
            "body": "[Gear] Track Reference: Slowdive - When the Sun Hits\n\nDo you run your reverse reverb BEFORE your fuzz, or fuzz into stereo reverb? I feel like running a Roland Space Echo into a vintage Big Muff gives that glorious melting texture where notes dissolve into vapor.",
            "image_url": "/assets/editorial/gig-flyer.svg",
            "media_type": "image",
            "created_offset_hours": 50,
            "replies": [
                {
                    "author": "post_punk_pete",
                    "body": "Always Reverb -> Fuzz -> Modulation for that pure Kevin Shields wash. If you put fuzz first, the distortion clamps down on the dynamics too tightly.",
                    "created_offset_hours": 48,
                },
                {
                    "author": "modular_synth",
                    "body": "Try adding a subtle analog pitch vibrato right between the reverb and fuzz! It gives that slight tape-warping flutter that makes dreampop chords sound so nostalgic.",
                    "created_offset_hours": 45,
                },
                {
                    "author": "shoegaze_queen",
                    "body": "Just tried the pitch vibrato trick with my Boss VB-2w — mind completely blown. Instant 1993 4AD Records vibes!",
                    "created_offset_hours": 40,
                },
            ],
        },
        {
            "author": "crate_digger_99",
            "tag": "City Pop",
            "title": "Hidden gems in 1980s Japanese City Pop beyond Tatsuro Yamashita",
            "body": "[Crate Digs] Track Reference: Piper - Summer Breeze\n\nEveryone knows 'For You' and Miki Matsubara, but Piper's 1983 LP 'Gentle Breeze' and Minako Yoshida's 'Monochrome' are masterclasses in boogie basslines and precision studio production. What obscure cuts are in your rotation?",
            "image_url": "/assets/editorial/lofi-tape.svg",
            "media_type": "image",
            "created_offset_hours": 36,
            "replies": [
                {
                    "author": "miles_ahead",
                    "body": "Minako Yoshida's horn arrangements are on par with Quincy Jones. The drum grooves on 'Midnight Driver' are ridiculously tight.",
                    "created_offset_hours": 34,
                },
                {
                    "author": "dub_techno_echo",
                    "body": "The synth programming on those records using early Prophet-5s and Roland Jupiter-8s laid the foundation for modern electronic music.",
                    "created_offset_hours": 30,
                },
            ],
        },
        {
            "author": "ambient_drifter",
            "tag": "Ambient",
            "title": "Tape loops, 4-track cassette recorders, and the beauty of analog hiss",
            "body": "[Field Notes] Track Reference: Brian Eno - 1/1\n\nRecorded rainfall hitting my windowsill at 3 AM onto an old Tascam Portastudio, then slowed it down by 50%. The tape hiss acts like a warm blanket over the acoustic piano chords.",
            "image_url": "/assets/editorial/ambient.svg",
            "media_type": "image",
            "created_offset_hours": 24,
            "replies": [
                {
                    "author": "modular_synth",
                    "body": "Nothing in software comes close to actual tape saturation and wow & flutter when you physically press your finger against the tape reel.",
                    "created_offset_hours": 22,
                },
                {
                    "author": "shoegaze_queen",
                    "body": "Please tell me you are releasing an EP of these field recordings! I need this in my bedtime listening rotation.",
                    "created_offset_hours": 18,
                },
                {
                    "author": "ambient_drifter",
                    "body": "Mastering 5 tracks this weekend Lyra! Will post a preview snippet here on Nox soon.",
                    "created_offset_hours": 15,
                },
            ],
        },
        {
            "author": "dub_techno_echo",
            "tag": "Dub Techno",
            "title": "The hypnotic architecture of Basic Channel and the Berlin minimal sound",
            "body": "[Vinyl Study] Track Reference: Rhythm & Sound - Mango Drive\n\nSub-bass that shakes your sternum, filtered white noise simulating sea foam, and infinite tape delay feedback. Moritz von Oswald and Mark Ernestus proved that repetition is a form of hypnosis.",
            "image_url": "/assets/editorial/industrial.svg",
            "media_type": "image",
            "created_offset_hours": 14,
            "replies": [
                {
                    "author": "post_punk_pete",
                    "body": "Deep, meditative, and uncompromising. Put this on in a dark room with good studio monitors and you lose all sense of time.",
                    "created_offset_hours": 12,
                },
                {
                    "author": "audiophile_dan",
                    "body": "Those 12-inch 45 RPM pressings have insane low-end headroom. Zero inner-groove distortion.",
                    "created_offset_hours": 10,
                },
            ],
        },
    ]

    for t_info in threads_data:
        author = user_map.get(t_info["author"])
        tag = tag_map.get(t_info["tag"])
        if not author or not tag:
            continue

        created_dt = datetime.utcnow() - timedelta(hours=t_info["created_offset_hours"])
        thread = Thread(
            user_id=author.id,
            tag_id=tag.id,
            title=t_info["title"],
            body=t_info["body"],
            image_url=t_info.get("image_url"),
            media_type=t_info.get("media_type"),
            created_at=created_dt,
        )
        session.add(thread)
        session.commit()
        session.refresh(thread)

        # Seed replies for this thread
        for rep in t_info.get("replies", []):
            rep_author = user_map.get(rep["author"])
            if not rep_author:
                continue
            rep_dt = datetime.utcnow() - timedelta(hours=rep["created_offset_hours"])
            post = Post(
                thread_id=thread.id,
                user_id=rep_author.id,
                body=rep["body"],
                created_at=rep_dt,
            )
            session.add(post)

        # Seed a few likes on the thread
        other_users = [u for u in user_map.values() if u.id != author.id]
        for like_user in other_users[:3]:
            like = ThreadLike(user_id=like_user.id, thread_id=thread.id)
            session.add(like)

        # Seed a repost
        if other_users:
            repost = ThreadRepost(user_id=other_users[0].id, thread_id=thread.id)
            session.add(repost)

        session.commit()

    # 4. Seed initial Follow relationships
    follow_pairs = [
        ("miles_ahead", "crate_digger_99"),
        ("miles_ahead", "audiophile_dan"),
        ("shoegaze_queen", "post_punk_pete"),
        ("shoegaze_queen", "ambient_drifter"),
        ("crate_digger_99", "miles_ahead"),
        ("crate_digger_99", "modular_synth"),
        ("modular_synth", "dub_techno_echo"),
        ("modular_synth", "ambient_drifter"),
        ("dub_techno_echo", "modular_synth"),
        ("dub_techno_echo", "post_punk_pete"),
        ("post_punk_pete", "shoegaze_queen"),
        ("audiophile_dan", "miles_ahead"),
        ("ambient_drifter", "shoegaze_queen"),
        ("ambient_drifter", "modular_synth"),
    ]

    for f_user, t_user in follow_pairs:
        u1 = user_map.get(f_user)
        u2 = user_map.get(t_user)
        if u1 and u2:
            existing_f = session.exec(
                select(UserFollow).where(
                    UserFollow.follower_id == u1.id,
                    UserFollow.following_id == u2.id,
                )
            ).first()
            if not existing_f:
                session.add(UserFollow(follower_id=u1.id, following_id=u2.id))

    session.commit()

    # 5. Seed initial Friendships (Mutual tastemaker circles)
    friend_pairs = [
        ("miles_ahead", "crate_digger_99", "accepted"),
        ("shoegaze_queen", "post_punk_pete", "accepted"),
        ("modular_synth", "ambient_drifter", "accepted"),
        ("dub_techno_echo", "modular_synth", "accepted"),
        ("audiophile_dan", "miles_ahead", "accepted"),
        # A pending friend request:
        ("crate_digger_99", "shoegaze_queen", "pending"),
    ]

    for u1_name, u2_name, status in friend_pairs:
        u1 = user_map.get(u1_name)
        u2 = user_map.get(u2_name)
        if u1 and u2:
            existing_fr = session.exec(
                select(Friendship).where(
                    Friendship.sender_id == u1.id,
                    Friendship.receiver_id == u2.id,
                )
            ).first()
            if not existing_fr:
                fr = Friendship(
                    sender_id=u1.id,
                    receiver_id=u2.id,
                    status=status,
                    created_at=datetime.utcnow() - timedelta(days=7),
                )
                session.add(fr)

    session.commit()
    print("[Seed] Seeding completed successfully!")

if __name__ == "__main__":
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)
    with Session(engine) as db_session:
        seed_database(db_session, force=True)
