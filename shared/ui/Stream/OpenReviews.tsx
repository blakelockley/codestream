import React from "react";
import { useDispatch, useSelector } from "react-redux";
import * as reviewSelectors from "../store/reviews/reducer";
import * as userSelectors from "../store/users/reducer";
import { CodeStreamState } from "../store";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import Icon from "./Icon";
import { Headshot } from "../src/components/Headshot";
import { H4, WideStatusSection } from "./StatusPanel";
import { setCurrentReview } from "../store/context/actions";
import { useDidMount } from "../utilities/hooks";
import { bootstrapReviews } from "../store/reviews/actions";
import Tooltip from "./Tooltip";
import Timestamp from "./Timestamp";

export function OpenReviews() {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { session, users } = state;

		const currentUserId = session.userId!;
		const teamMembers = userSelectors.getTeamMembers(state);
		const reviews = reviewSelectors.getByStatusAndUser(state, "open", currentUserId);

		return {
			reviews,
			currentUserId,
			teamMembers,
			currentUsername: users[session.userId!].username
		};
	});

	const reviewsState = useSelector((state: CodeStreamState) => state.reviews);

	useDidMount(() => {
		if (!reviewsState.bootstrapped) {
			dispatch(bootstrapReviews());
		}
	});

	const { reviews, teamMembers } = derivedState;

	const sortedReviews = [...reviews];
	sortedReviews.sort((a, b) => b.createdAt - a.createdAt);

	if (reviews.length == 0) return null;
	return (
		<WideStatusSection>
			<H4 style={{ paddingLeft: "20px" }}>Open Reviews</H4>
			{sortedReviews.map(review => {
				const creator = teamMembers.find(user => user.id === review.creatorId);
				return (
					<Row key={"review-" + review.id} onClick={() => dispatch(setCurrentReview(review.id))}>
						<div>
							<Tooltip title={creator && creator.fullName} placement="bottomLeft">
								<span>
									<Headshot person={creator} />
								</span>
							</Tooltip>
						</div>
						<div>
							<span>{review.title}</span>
							<span className="subtle">{review.text}</span>
						</div>
						<div className="icons">
							<Icon
								name="review"
								className="clickable"
								title="Review Changes"
								placement="bottomLeft"
								delay={1}
							/>
							<Timestamp time={review.createdAt} relative abbreviated />
						</div>
					</Row>
				);
			})}
		</WideStatusSection>
	);
}
