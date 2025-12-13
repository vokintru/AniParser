from flask import Blueprint, request, render_template, redirect
from flask_login import login_required, current_user
from apis import shikimori
import config
import urllib

main_bp = Blueprint('main', __name__)


@main_bp.route("/")
@login_required
def home():
    error = request.args.get('error', default=None)
    return render_template("index.html", error=error)

@main_bp.route("/watchlist")
@login_required
def watchlist():
    return render_template("watchlist.html")

@main_bp.route("/watchlist/rand")
@login_required
def watchlist_rand():
    rid = shikimori.random_watchlist(current_user.shiki_user_id, current_user.shiki_access_token)
    if rid == {'error': 'reauth'}:
        return redirect(f"/reauth")
    return redirect(f"/release/{rid['anime']['id']}")


@main_bp.route("/search")
@login_required
def search():
    query = request.args.get('q', default=None)
    return render_template("search.html", query=query)

@main_bp.route("/search/<string:query>")
@login_required
def search_with_query(query):
    return render_template("search.html", query=query)

@main_bp.route("/release/<int:release_id>")
@main_bp.route("/release/<int:release_id>/")
@login_required
def release(release_id):
    return render_template("title.html", release_id=release_id)

@main_bp.route("/watch/<int:title_id>/<int:translation_id>")
@main_bp.route("/watch/<int:title_id>/<int:translation_id>/")
@login_required
def watch(title_id, translation_id):
    return render_template("watch.html", title_id=title_id, translation_id=translation_id)

@main_bp.route("/watch/<int:title_id>")
@main_bp.route("/watch/<int:title_id>/")
@login_required
def watch_without(title_id):
    ep = request.args.get('ep', default=1)
    return render_template("title.html", release_id=title_id, chose_translation=True, ep_id=ep)

#old ways

@main_bp.route("/release")
def old_release():
    release_id = request.args.get('title_id', default=None)
    return redirect(f'/release/{release_id}', code=301)